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
import { TxnNotifierService } from '../src/transaction_notifier/notifier.service';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainService } from '#blockchain/blockchain.service';
import { signPayloadSr25519 } from '@projectlibertylabs/frequency-scenario-template';
import Keyring from '@polkadot/keyring';
import { createServer, IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path from 'path';

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
  let providerApiToken: string;
  let blockchainService: BlockchainService;
  let prismProcess: ChildProcessWithoutNullStreams | undefined;
  let captureServer: Server | undefined;
  const receivedWebhooks: { body: TxWebhookRsp; headers: IncomingHttpHeaders }[] = [];

  const getFreePort = async (): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      const server = createServer();
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        const { port } = address;
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(port);
        });
      });
    });

  const parseRequestBody = async (req: IncomingMessage): Promise<any> =>
    new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString('utf8');
      });
      req.on('end', () => {
        if (!body) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });

  const killPrism = async () => {
    if (!prismProcess || prismProcess.killed) {
      return;
    }
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        prismProcess?.kill('SIGKILL');
      }, 3000);
      prismProcess?.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      prismProcess?.kill('SIGTERM');
    });
  };

  beforeAll(async () => {
    const capturePort = await getFreePort();
    const prismPort = await getFreePort();

    captureServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method === 'POST' && req.url === '/transaction-notify') {
        const body = (await parseRequestBody(req)) as TxWebhookRsp;
        receivedWebhooks.push({ body, headers: req.headers });
        res.statusCode = 200;
        res.end('ok');
        return;
      }
      if (req.method === 'GET' && req.url === '/healthz') {
        res.statusCode = 200;
        res.end('ok');
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve, reject) => {
      captureServer?.listen(capturePort, '127.0.0.1', (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    const openApiPath = path.resolve(process.cwd(), 'openapi-specs/account-webhooks.openapi.yaml');
    const prismBin = path.resolve(process.cwd(), 'node_modules/.bin/prism');
    const prismArgs = [
      'proxy',
      openApiPath,
      `http://127.0.0.1:${capturePort}`,
      '--port',
      String(prismPort),
      '--errors',
      '--host',
      '127.0.0.1',
    ];
    prismProcess = spawn(prismBin, prismArgs, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for Prism to start')), 20_000);
      const onData = (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        if (text.includes(`http://127.0.0.1:${prismPort}`) || text.toLowerCase().includes('prism is listening')) {
          clearTimeout(timer);
          prismProcess?.stdout.off('data', onData);
          prismProcess?.stderr.off('data', onData);
          resolve();
        }
      };
      prismProcess?.stdout.on('data', onData);
      prismProcess?.stderr.on('data', onData);
      prismProcess?.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Prism exited before startup (code ${code ?? 'unknown'})`));
      });
    });

    process.env.WEBHOOK_BASE_URL = `http://127.0.0.1:${prismPort}`;

    module = await Test.createTestingModule({
      imports: [WorkerModule],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IAccountWorkerConfig>(WorkerConfig.KEY);
    providerApiToken = config.providerApiToken;
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
    await killPrism();
    if (captureServer) {
      await new Promise<void>((resolve) => {
        captureServer?.close(() => resolve());
      });
    }
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
        const matchedCall = receivedWebhooks.find(
          ({ body }) => (body as TxWebhookRsp | undefined)?.transactionType === TransactionType.CAPACITY_BATCH,
        );
        if (matchedCall) {
          return matchedCall;
        }
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), pollMs);
        });
      }

      throw new Error('Timed out waiting for CAPACITY_BATCH webhook');
    })();

    expect(webhookPayload.body).toEqual({
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
    expect(webhookPayload.headers.authorization).toBe(providerApiToken);
    expect(receivedWebhooks.length).toBeGreaterThan(0);
  }, 30_000);
});
