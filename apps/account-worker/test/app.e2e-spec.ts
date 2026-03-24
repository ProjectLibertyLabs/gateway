import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { WorkerModule } from '../src/worker.module';
import WorkerConfig, { IAccountWorkerConfig } from '#account-worker/worker.config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bull-shared';
import { Queue, QueueEvents } from 'bullmq';
import { AccountQueues } from '#types/constants/queue.constants';
import { TransactionType, TxWebhookRsp } from '#types/account-webhook';
import axios from 'axios';
import { TxnNotifierService } from '../src/transaction_notifier/notifier.service';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainService } from '#blockchain/blockchain.service';
import { signPayloadSr25519 } from '@projectlibertylabs/frequency-scenario-template';
import Keyring from '@polkadot/keyring';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const providerApi = actual.default.create({
    baseURL: process.env.WEBHOOK_BASE_URL,
  });
  providerApi.post = jest.fn();
  providerApi.get = jest.fn();
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      create: jest.fn(() => providerApi),
    },
  };
});

process.env.CACHE_KEY_PREFIX = 'account-worker-e2e:';
jest.setTimeout(120_000);

describe('Account Service E2E request verification!', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let httpServer: any;
  let txQueue: Queue;
  let txQueueEvents: QueueEvents;
  let txNotifier: TxnNotifierService;
  let providerId: string;
  let blockchainService: BlockchainService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IAccountWorkerConfig>(WorkerConfig.KEY);
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, enableDebugMessages: true }));
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();

    httpServer = app.getHttpServer();
    txQueue = app.get(getQueueToken(AccountQueues.TRANSACTION_PUBLISH_QUEUE));
    txQueueEvents = new QueueEvents(AccountQueues.TRANSACTION_PUBLISH_QUEUE, {
      connection: (txQueue as any).opts?.connection,
      prefix: (txQueue as any).opts?.prefix,
    });
    await txQueueEvents.waitUntilReady();
    txNotifier = app.get<TxnNotifierService>(TxnNotifierService);
    blockchainService = app.get<BlockchainService>(BlockchainService);
    const chainConfig = app.get<IBlockchainConfig>(blockchainConfig.KEY);
    providerId = chainConfig.providerId.toString();

    await blockchainService.isReady();
  });

  afterAll(async () => {
    if (txQueueEvents) {
      await txQueueEvents.close();
    }
    if (app) {
      await app.close();
    }
    if (httpServer) {
      await httpServer.close();
    }

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

  it('(GET) /healthz', () =>
    request(httpServer)
      .get('/healthz')
      .expect(200)
      .then((res) => {
        const baseConfigExpectation: { [key: string]: any } = {
          apiBodyJsonLimit: expect.any(String),
          apiPort: expect.any(Number),
          apiTimeoutMs: expect.any(Number),
          blockchainScanIntervalSeconds: expect.any(Number),
          healthCheckMaxRetries: expect.any(Number),
          healthCheckMaxRetryIntervalSeconds: expect.any(Number),
          healthCheckSuccessThreshold: expect.any(Number),
          providerApiToken: expect.any(String),
          trustUnfinalizedBlocks: expect.any(Boolean),
          webhookBaseUrl: expect.any(String),
          webhookFailureThreshold: expect.any(Number),
          webhookRetryIntervalSeconds: expect.any(Number),
        };

        expect(res.body).toEqual(
          expect.objectContaining({
            status: 200,
            message: 'Service is healthy',
            timestamp: expect.any(Number),
            config: expect.objectContaining(baseConfigExpectation),
            redisStatus: expect.objectContaining({
              connected_clients: expect.any(Number),
              maxmemory: expect.any(Number),
              redis_version: expect.any(String),
              uptime_in_seconds: expect.any(Number),
              used_memory: expect.any(Number),
              queues: expect.arrayContaining([
                expect.objectContaining({
                  name: expect.any(String),
                  waiting: expect.any(Number),
                  active: expect.any(Number),
                  completed: expect.any(Number),
                  failed: expect.any(Number),
                  delayed: expect.any(Number),
                }),
              ]),
            }),
            blockchainStatus: expect.objectContaining({
              frequencyApiWsUrl: expect.any(String),
              latestBlockHeader: expect.objectContaining({
                blockHash: expect.any(String),
                number: expect.any(Number),
                parentHash: expect.any(String),
              }),
            }),
          }),
        );
      }));

  it('(GET) /livez', () =>
    request(httpServer).get('/livez').expect(200).expect({ status: 200, message: 'Service is live' }));

  it('(GET) /readyz', () =>
    request(httpServer).get('/readyz').expect(200).expect({ status: 200, message: 'Service is ready' }));

  it('(GET) /metrics', () => request(httpServer).get('/metrics').expect(200));

  it('submits CAPACITY_BATCH and posts expected webhook payload', async () => {
    const providerApi = (axios.create as unknown as jest.Mock).mock.results[0]?.value as {
      post: jest.Mock;
    };
    expect(providerApi).toBeDefined();
    providerApi.post.mockResolvedValue({ status: 200 } as any);
    const referenceId = `capacity-batch-${Date.now()}`;
    const api = (await blockchainService.getApi()) as any;
    const delegatorKeypair = new Keyring({ type: 'sr25519' }).addFromUri(`//${referenceId}`);
    const currentBlock = (await blockchainService.getBlockForSigning()).number;
    const addProviderPayload = api.registry.createType('PalletMsaAddProvider', {
      authorizedMsaId: providerId,
      intentIds: [],
      expiration: currentBlock + 10,
    });
    const encodedCall = api.tx.msa
      .createSponsoredAccountWithDelegation(
        delegatorKeypair.address,
        signPayloadSr25519(delegatorKeypair, addProviderPayload),
        addProviderPayload,
      )
      .toHex();

    const job = await txQueue.add(
      referenceId,
      {
        type: TransactionType.CAPACITY_BATCH,
        providerId,
        referenceId,
        calls: [
          {
            pallet: 'system',
            extrinsicName: 'remarkWithEvent',
            encodedExtrinsic: encodedCall,
          },
        ],
      } as any,
      { jobId: referenceId },
    );

    await job.waitUntilFinished(txQueueEvents);

    const webhookPayload = await (async () => {
      const timeoutMs = 20_000;
      const pollMs = 1_000;
      const end = Date.now() + timeoutMs;

      while (Date.now() < end) {
        await (txNotifier as unknown as any).setLastSeenBlockNumber(currentBlock);
        await txNotifier.scan();
        const matchedCall = providerApi.post.mock.calls.find(
          ([, body]) => (body as TxWebhookRsp | undefined)?.transactionType === TransactionType.CAPACITY_BATCH,
        );
        if (matchedCall) {
          return matchedCall[1] as TxWebhookRsp;
        }
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), pollMs);
        });
      }

      throw new Error('Timed out waiting for CAPACITY_BATCH webhook');
    })();

    expect(webhookPayload).toEqual({
      blockHash: expect.stringMatching(/0x[a-fA-F0-9]{32}/),
      calls: [
        {
          section: 'msa',
          method: 'createSponsoredAccountWithDelegation',
        },
      ],
      capacityWithdrawnEvent: {
        amount: expect.stringMatching(/^[0-9]+$/),
        msaId: providerId,
      },
      msaId: providerId,
      providerId,
      referenceId,
      transactionType: TransactionType.CAPACITY_BATCH,
      txHash: expect.stringMatching(/0x[a-fA-F0-9]{32}/),
    });
    expect(providerApi.post).toHaveBeenCalledWith('/transaction-notify', expect.any(Object));
  }, 30_000);
});
