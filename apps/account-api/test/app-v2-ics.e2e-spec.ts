// Mock Polkadot logger BEFORE any imports to suppress logs
jest.mock('@polkadot/util/cjs/logger', () => ({
  logger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    noop: jest.fn(),
  }),
  loggerFormat: jest.fn((v) => v),
}));

import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { ApiModule } from '#account-api/api.module';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
// import { cryptoWaitReady } from '@polkadot/util-crypto';
// import { setupProviderAndUsers } from './e2e-setup.mock.spec';
// import { ChainUser } from '@projectlibertylabs/frequency-scenario-template';
// import { getUnifiedAddress } from '@frequency-chain/ethereum-utils';

describe('Ics Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  // let users: ChainUser[];
  // let provider: ChainUser;
  // let goodId: string = '';

  beforeAll(async () => {
    // await cryptoWaitReady();
    // ({ provider, users } = await setupProviderAndUsers());
    // console.log({ provider });
    // goodId = getUnifiedAddress(provider.keypair);

    module = await Test.createTestingModule({
      imports: [ApiModule],
      providers: [],
    }).compile();
    app = module.createNestApplication();

    const config = app.get<IAccountApiConfig>(apiConfig.KEY);
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
  }, 10_000);

  describe('(POST) v1/ics/:accountId/publishAll', () => {
    const validAction = {
      type: 'ADD_ITEM',
      encodedPayload: '0x1122',
    };
    const validAddIcsPublicKeyBody = {
      schemaId: 1234,
      targetHash: 1_344_333,
      expiration: 1_333_333,
      actions: [validAction],
    };
    describe('accountId parameter verification', () => {
      it('happy path', async () => {
        const goodId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        const url = `/v1/ics/${goodId}/publishAll`;
        await request(app.getHttpServer()).post(url).send(validAddIcsPublicKeyBody).expect(202);
      }, 5_000);
    });
  });
});
