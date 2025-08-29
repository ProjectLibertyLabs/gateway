/* eslint-disable unused-imports/no-unused-vars */
import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { AddKeyData, ChainUser, ExtrinsicHelper, createKeys } from '@projectlibertylabs/frequency-scenario-template';
import { KeyringPair } from '@polkadot/keyring/types';
import { KeysRequestDto } from '#types/dtos/account';
import { ApiModule } from '../src/api.module';
import {
  generateAddPublicKeyExtrinsic,
  removeExtraKeysFromMsa,
  generateSignedAddKeyPayload,
  setupProviderAndUsers,
} from './e2e-setup.mock.spec';
import { CacheMonitorService } from '#cache/cache-monitor.service';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';

let HTTP_SERVER: any;

describe('Keys Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let users: ChainUser[];
  let provider: ChainUser;
  let currentBlockNumber: number;
  let maxMsaId: string;

  let newKey0: KeyringPair;

  beforeAll(async () => {
    ({ users, provider, currentBlockNumber, maxMsaId } = await setupProviderAndUsers());

    // Remove all but the "primary" key from each of the test MSAs, and provision 2 MSAs
    // with keys that we generate here.

    for (const u of users) {
      if (u.msaId) await removeExtraKeysFromMsa({ msaId: u.msaId.toString(), keypair: u.keypair });
    }

    newKey0 = createKeys('new key', `${users[0].uri}//newkey`);
    const newKey1 = createKeys('new key', `${users[1].uri}//newkey`);
    try {
      await ExtrinsicHelper.payWithCapacityBatchAll(provider.keypair, [
        (await generateAddPublicKeyExtrinsic(users[0], newKey0, currentBlockNumber))(),
        (await generateAddPublicKeyExtrinsic(users[1], newKey1, currentBlockNumber))(),
      ]).signAndSend();
    } catch (_e) {
      // no-op
    }

    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication({ logger: ['error', 'warn', 'log', 'verbose', 'debug'], rawBody: true });

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

    HTTP_SERVER = app.getHttpServer();

    // Redis timeout keeping test suite alive for too long; disable
    const cacheMonitor = app.get<CacheMonitorService>(CacheMonitorService);
    cacheMonitor.startConnectionTimer = jest.fn();
  });

  afterAll(async () => {
    for (const u of users) {
      if (u.msaId) await removeExtraKeysFromMsa({ msaId: u.msaId.toString(), keypair: u.keypair });
    }

    await ExtrinsicHelper.disconnect();
    await app.close();
    await HTTP_SERVER.close();

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

  describe('POST tests', () => {
    it('(POST) /keys/add adds a key to an msa', async () => {
      // users[2] should have a single key, this will (eventually) add another
      const user = users[2];
      const newKeypair = createKeys();
      const { payload, ownerProof, newKeyProof } = await generateSignedAddKeyPayload(
        user,
        newKeypair,
        currentBlockNumber,
      );
      const keysRequest: KeysRequestDto = {
        msaOwnerAddress: user.keypair.address,
        msaOwnerSignature: ownerProof.Sr25519,
        newKeyOwnerSignature: newKeyProof.Sr25519,
        payload: {
          ...(payload as Required<AddKeyData>),
          msaId: payload.msaId!.toString(),
        },
      };

      await request(HTTP_SERVER).post('/v1/keys/add').send(keysRequest).expect(200);
    });
  });

  describe('GET tests', () => {
    it('(GET) /keys/:msaId with valid msaId and multiple keys', async () => {
      // users[0] should have 2 keys based on our setup
      const user = users[0];
      const validMsaId = user.msaId!.toString();
      await request(HTTP_SERVER)
        .get(`/v1/keys/${validMsaId}`)
        .expect(200)
        .expect({
          msaKeys: [user.keypair.address, newKey0.address],
        });
    });

    it('(GET) /keys/:msaId with valid msaId and one key', async () => {
      // users[3] should have a single key based on our setup
      const user = users[3];
      const validMsaId = user.msaId?.toString();
      await request(HTTP_SERVER)
        .get(`/v1/keys/${validMsaId}`)
        .expect(200)
        .expect({ msaKeys: [user.keypair.address] });
    });

    it('(GET) /keys/:msaId with invalid msaId', async () => {
      const invalidMsaId = BigInt(maxMsaId) + 1000n;
      await request(HTTP_SERVER)
        .get(`/v1/keys/${invalidMsaId.toString()}`)
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => expect(res.text).toContain('Keys not found for'));
    });
  });
});
