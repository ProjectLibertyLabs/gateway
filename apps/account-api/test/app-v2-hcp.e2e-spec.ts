import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { ApiModule } from '#content-publishing-api/api.module';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { setupProviderAndUsers } from './e2e-setup.mock.spec';
import { ChainUser } from '@projectlibertylabs/frequency-scenario-template';
import { getUnifiedAddress } from '@frequency-chain/ethereum-utils';

describe('Hcp Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let users: ChainUser[];
  let provider: ChainUser;
  let goodId: string = '';


  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeAll(async () => {
    await cryptoWaitReady();
    ({ provider, users } = await setupProviderAndUsers());
    console.log({ provider });
    goodId = getUnifiedAddress(provider.keypair);
    console.log(goodId);


    module = await Test.createTestingModule({
      imports: [ApiModule],
      providers: [],
    }).compile();
    app = module.createNestApplication();

    const config = app.get<IContentPublishingApiConfig>(apiConfig.KEY);
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        enableDebugMessages: true,
      }),
    );
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });
    app.useLogger(app.get(Logger));

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  }, 60_000);

  describe('(POST) v1/hcp/:accountId/publishAll', () => {
    const validAction = {
      type: 'ADD_ITEM',
      encodedPayload: '0x1122',
    };
    const validAddHcpPublicKeyBody = {
      schemaId: 1234,
      targetHash: 1_344_333,
      expiration: 1_333_333,
      actions: [validAction],
    };
    describe('accountId parameter verification', () => {
      it('happy path', async () => {
        const url = `/v1/hcp/${goodId}/publishAll`;

        console.log({url})

        await request(app.getHttpServer())
          .post(`/v1/hcp/${goodId}/publishAll`)
          .send(validAddHcpPublicKeyBody)
          .expect(202);
      }, 5_000);

      it('validates accountId param format', async () => {
        const badId = 1234;
        let expectedError =
          'accountId should be a valid 32 bytes representing an account Id or address in Hex or SS58 format!';


        const url = `/v1/hcp/${badId}/publishAll`;
        await request(app.getHttpServer())
          .post(url)
          .send(validAddHcpPublicKeyBody)
          .expect(400)
          .expect((res) => {
            const actualError = res.body.message.toString();
            expect(actualError).toEqual(expectedError);
          });
      }, 5_000);

      it('validates accountId exists on chain', async () => {});

      it('validates schemaId', async () => {
        const invalidAddHcpPublicKeyBody = {
          schemaId: 'xyz',
          targetHash: '5',
          expiration: '3838383',
          actions: [validAction],
        };

        await request(app.getHttpServer())
          .post(`/v1/hcp/${goodId}/publishAll`)
          .send(invalidAddHcpPublicKeyBody)
          .expect(400)
          .expect((res) => {
            const actualError = res.body.message.toString();
            expect(actualError).toEqual('schemaId should be a positive number!');
          });
      });

      it('refuses invalid action type enum', async () => {
        const invalidAction = {
          type: 'XYZ',
          encodedPayload: '0x1122',
        };
        const invalidaddHcpPublicKeyBody = {
          schemaId: 1234,
          targetHash: 1_344_333,
          expiration: 1_333_333,
          actions: [invalidAction],
        };

        const response = await request(app.getHttpServer())
          .post(`/v1/hcp/${goodId}/publishAll`)
          .send(invalidaddHcpPublicKeyBody);

        expect(response.status).toBe(400);
        const actualError = response.body.message.toString();
        expect(actualError).toEqual('actions.0.type must be one of the following values: ADD_ITEM, DELETE_ITEM');
      });

      it('refuses targetHash and expiration with non-numeric string', async () => {
        const nonNumericVal = 'Hello';
        const invalidTargetHashBody = {
          ...validAddHcpPublicKeyBody,
          targetHash: nonNumericVal,
        };

        await request(app.getHttpServer())
          .post(`/v1/hcp/${goodId}/publishAll`)
          .send(invalidTargetHashBody)
          .expect(400)
          .expect((res) => {
            const actualError = res.body.message.toString();
            expect(actualError).toEqual('targetHash should be a number between 0 and 4294967296!');
          });

        const invalidExpirationBody = {
          ...validAddHcpPublicKeyBody,
          expiration: nonNumericVal,
        };

        await request(app.getHttpServer())
          .post(`/v1/hcp/${goodId}/publishAll`)
          .send(invalidExpirationBody)
          .expect(400)
          .expect((res) => {
            const actualError = res.body.message.toString();
            expect(actualError).toEqual('expiration should be a number between 0 and 4294967296!');
          });
      });
    });
  });
  describe('posting the batch call', () => {});
});
