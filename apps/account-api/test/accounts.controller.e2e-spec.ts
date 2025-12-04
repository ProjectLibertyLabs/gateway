import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ChainUser, ExtrinsicHelper, getClaimHandlePayload } from '@projectlibertylabs/frequency-scenario-template';
import { uniqueNamesGenerator, colors, names } from 'unique-names-generator';
import { ApiModule } from '../src/api.module';
import { setupProviderAndUsers } from './e2e-setup.mock.spec';
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { CacheMonitorService } from '#cache/cache-monitor.service';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';

import { Logger } from 'nestjs-pino';

describe('Account Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let currentBlockNumber: number;
  let users: ChainUser[];
  let provider: ChainUser;
  let maxMsaId: string;
  let httpServer: any;

  const handle = uniqueNamesGenerator({ dictionaries: [colors, names], separator: '', length: 2, style: 'capital' });

  beforeAll(async () => {
    await cryptoWaitReady();
    ({ currentBlockNumber, maxMsaId, provider, users } = await setupProviderAndUsers());

    const handlePayload = getClaimHandlePayload(users[0], handle, currentBlockNumber);

    // Make sure handles for our test users are in a known state:
    // users[0] has a known handle (baseHandle = handles[0])
    // users[2] & users[3] have no handle
    try {
      await Promise.allSettled([
        ...users.map((u) => ExtrinsicHelper.retireHandle(u.keypair).signAndSend()),
        ExtrinsicHelper.claimHandleWithProvider(
          users[0].keypair,
          provider.keypair,
          handlePayload.proof,
          handlePayload.payload,
        ).payWithCapacity(),
      ]);
    } catch (e) {
      // do nothing
      console.error(e);
    }

    const claimedHandle = await ExtrinsicHelper.apiPromise.rpc.handles.getHandleForMsa(users[0].msaId);
    if (claimedHandle.isNone) {
      console.error('No handle found when handle should have been claimed');
    }

    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();
    app.useLogger(app.get(Logger));

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IAccountApiConfig>(apiConfig.KEY);
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

    // Make sure we're connected to the chain before running tests
    const blockchainService = app.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    await blockchainService.isReady();

    httpServer = app.getHttpServer();

    // Redis timeout keeping test suite alive for too long; disable
    const cacheMonitor = app.get<CacheMonitorService>(CacheMonitorService);
    cacheMonitor.startConnectionTimer = jest.fn();
  });

  afterAll(async () => {
    // Retire all claimed handles
    try {
      await Promise.allSettled(users.map((u) => ExtrinsicHelper.retireHandle(u.keypair).signAndSend()));
    } catch (e) {
      // do nothing
      console.error(e);
    }

    await ExtrinsicHelper.disconnect();
    await app.close();
    await httpServer.close();

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

  describe('(GET) /accounts', () => {
    it('(GET) /v1/accounts/:msaId with valid msaId and no handle', async () => {
      const user = users[2];
      const validMsaId = user.msaId?.toString();
      const { body } = await request(httpServer).get(`/v1/accounts/${validMsaId}`).expect(200).expect({
        msaId: user.msaId?.toString(),
      });
      expect(body).not.toHaveProperty('handle');
    });

    it('(GET) /v1/accounts/:msaId with invalid msaId', async () => {
      const invalidMsaId = BigInt(maxMsaId) + 1000n;
      await request(httpServer)
        .get(`/v1/accounts/${invalidMsaId.toString()}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => expect(res.text).toContain('Failed to find the account'));
    });

    it('(GET) /v1/accounts/:msaId with valid msaId and handle', async () => {
      const user = users[0];
      const validMsaId = user.msaId?.toString();
      await request(httpServer)
        .get(`/v1/accounts/${validMsaId}`)
        .expect(200)
        .expect((res) => res.body.msaId === validMsaId)
        .expect((res) => res.body.handle.base_handle === handle);
    });
  });

  describe('retireMsa', () => {
    it('(GET) /v1/accounts/retireMsa/:accountId get payload for retireMsa, given a valid accountId', async () => {
      const accountId = users[0].keypair.address;
      const path = `/v1/accounts/retireMsa/${accountId}`;

      const encodedExtrinsic = '0x0c043c0a';

      await request(httpServer)
        .get(path)
        .expect(HttpStatus.OK)
        .expect(({ body }) => expect(body.encodedExtrinsic).toStrictEqual(encodedExtrinsic))
        .expect(({ body }) => expect(body.accountId).toStrictEqual(accountId))
        .expect(({ body }) => expect(body.payloadToSign).toMatch(/^0x3c0a/));
    });

    it('(GET) /v1/accounts/retireMsa/:accountId get payload for retireMsa, given an invalid accountId', async () => {
      const accountId = '0x123';
      const path = `/v1/accounts/retireMsa/${accountId}`;
      await request(httpServer).get(path).expect(HttpStatus.BAD_REQUEST);
    });

    it('(POST) /v1/accounts/retireMsa post retireMsa', async () => {
      const { keypair } = users[1];
      const accountId = keypair.address;

      const getPath: string = `/v1/accounts/retireMsa/${accountId}`;
      const { body: getRetireMsaResponse } = await request(httpServer).get(getPath);
      const responseData: RetireMsaPayloadResponseDto = getRetireMsaResponse;

      const signature = u8aToHex(keypair.sign(responseData.payloadToSign, { withType: true }));

      const retireMsaRequest: RetireMsaRequestDto = {
        ...responseData,
        signature,
      };

      const postPath: string = '/v1/accounts/retireMsa';
      await request(httpServer)
        .post(postPath)
        .send(retireMsaRequest)
        .expect(HttpStatus.CREATED)
        .expect(({ body }) => expect(body.referenceId).toBeDefined());
    });
  });
});
