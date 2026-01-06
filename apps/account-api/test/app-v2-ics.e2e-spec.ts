// Mock Polkadot logger BEFORE any imports to suppress logs
import {
  AddNewPublicKeyAgreementPayloadRequest,
  AddNewPublicKeyAgreementRequestDto,
  IcsPublishAllRequestDto,
  ItemActionDto,
  ItemizedSignaturePayloadDto,
  UpsertPagePayloadDto,
} from '#types/dtos/account';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { ApiModule } from '#account-api/api.module';
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
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import Keyring from '@polkadot/keyring';

// suppress polkadot logs
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

describe('Ics Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let users: ChainUser[];
  let provider: ChainUser;
  let keyring: Keyring;

  beforeAll(async () => {
    await cryptoWaitReady();
    keyring = new Keyring({ type: 'sr25519' });
    const res = await setupProviderAndUsers();
    users = res.users;
    provider = res.provider;

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
    // Make sure we're connected to the chain before running tests
    const blockchainService = app.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    await blockchainService.isReady();
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  }, 10_000);

  describe('(POST) v1/ics/:accountId/publishAll', () => {
    const addIcsPublicKeyPayload = new AddNewPublicKeyAgreementRequestDto();
    const addContextGroupPRIDEntryPayload = new AddNewPublicKeyAgreementRequestDto();
    const addContentGroupMetadataPayload = new UpsertPagePayloadDto();

    const goodIcsPublishAllPayload = new IcsPublishAllRequestDto();
    goodIcsPublishAllPayload.addIcsPublicKeyPayload = addIcsPublicKeyPayload;
    goodIcsPublishAllPayload.addContextGroupPRIDEntryPayload = addContextGroupPRIDEntryPayload;
    goodIcsPublishAllPayload.addContentGroupMetadataPayload = addContentGroupMetadataPayload;

    describe('accountId parameter verification', () => {
      it('happy path submits to chain', async () => {
        let goodId = getUnifiedAddress(provider.keypair);
        const url = `/v1/ics/${goodId}/publishAll`;
        const resp = await request(app.getHttpServer()).post(url).send(goodIcsPublishAllPayload);
        expect(resp.status).toBe(202);
        expect(resp.body?.referenceId).toBeDefined();
      }, 5_000);
      it('key with no msaid', async () => {
        const newKey = keyring.addFromSeed(Uint8Array.from(Array(32).fill(3)));
        const newAddr = getUnifiedAddress(newKey);
        const url = `/v1/ics/${newAddr}/publishAll`;
        await request(app.getHttpServer()).post(url).send(goodIcsPublishAllPayload).expect(400);
      });
    });
    describe('payload verification', () => {
      it('requires all payloads', async() => {
        let badPayload = { addIcsPublicKeyPayload };
        let goodId = getUnifiedAddress(provider.keypair);
        const url = `/v1/ics/${goodId}/publishAll`;
        const resp = await request(app.getHttpServer()).post(url).send(badPayload);
        expect(resp.status).toBe(400);
      });
    });
  });
});
