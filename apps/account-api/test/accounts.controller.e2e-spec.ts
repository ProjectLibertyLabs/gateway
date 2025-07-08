/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
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
import { WalletLoginRequestDto, RetireMsaPayloadResponseDto, RetireMsaRequestDto } from '#types/dtos/account';
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
      expect(body).not.toContain('handle');
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

  describe('(POST) /accounts/siwf', () => {
    it('Sign Up With Frequency request should work', async () => {
      const siwfRequest: WalletLoginRequestDto = {
        signIn: {},
        signUp: {
          extrinsics: [
            {
              pallet: 'msa',
              extrinsicName: 'createSponsoredAccountWithDelegation',
              encodedExtrinsic:
                '0xed01043c01b01b4dcafc8a8e73bff98e7558249f53cd0e0e64fa6b8f0159f0913d4874d9360176644186458bad3b00bbd0ac21e6c9bd5a8bed9ced7a772d11a9aac025b47f6559468808e272696f596a02af230951861027c0dc30f7163ecf316838a0723483010000000000000014000000000000000000004d000000',
            },
            {
              pallet: 'handles',
              extrinsicName: 'claimHandle',
              encodedExtrinsic:
                '0xb901044200b01b4dcafc8a8e73bff98e7558249f53cd0e0e64fa6b8f0159f0913d4874d93601225508ae2da9804c60660a150277eb32b2a0f6b9c8f6e07dd6cad799cb31ae1dfb43896f488e9c0b7ec8b530d930b3f9b690683f2765d5def3fee3fc6540d58714656e6464794d000000',
            },
          ],
        },
      };

      await request(httpServer).post(`/v1/accounts/siwf`).send(siwfRequest).expect(201);
    });

    it('Sign In With Frequency request should work', (done) => {
      const siwfRequest: WalletLoginRequestDto = {
        signIn: {
          siwsPayload: {
            message:
              'localhost wants you to sign in with your Frequency account:\n5Fghb4Wt3sg9cF6Q2Qucp5jXV5pL2U9uaYXwR9R8W8SYe9np\n\nThe domain localhost wants you to sign in with your Frequency account via localhost\n\nURI: http://localhost:5173/signin/confirm\nNonce: N6rLwqyz34oUxJEXJ\nIssued At: 2024-03-05T23:18:03.041Z\nExpiration Time: 2024-03-05T23:23:03.041Z',
            signature:
              '0x38faa2fc6f59bef8ffccfc929fb966e1d53ba45e3af7a029ea1d636eaddcbe78a4be0f89eaf7ff7bbaef20a070ad65f9d0f876889686687ef623214fddddb18b',
          },
        },
        signUp: {
          extrinsics: [],
        },
      };

      request(httpServer).post(`/v1/accounts/siwf`).send(siwfRequest).expect(201).end(done);
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
