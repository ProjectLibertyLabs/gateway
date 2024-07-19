/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { KeysRequest } from '#lib/types/dtos/keys.request.dto';
import { AddKeyData, ChainUser, ExtrinsicHelper, createKeys } from '@amplica-labs/frequency-scenario-template';
import { KeyringPair } from '@polkadot/keyring/types';
import { ApiModule } from '../src/api.module';
import {
  generateAddPublicKeyExtrinsic,
  removeExtraKeysFromMsa,
  generateSignedAddKeyPayload,
  setupProviderAndUsers,
} from './e2e-setup.mock.spec';

let HTTP_SERVER: any = process.env.HTTP_SERVER || 'http://0.0.0.0:3000';

describe('Keys Controller', () => {
  let app: INestApplication;
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
      await removeExtraKeysFromMsa(u);
    }

    newKey0 = createKeys('new key', `${users[0].uri}//newkey`);
    const newKey1 = createKeys('new key', `${users[1].uri}//newkey`);
    try {
      await ExtrinsicHelper.payWithCapacityBatchAll(provider.keypair, [
        (await generateAddPublicKeyExtrinsic(users[0], newKey0, currentBlockNumber))(),
        (await generateAddPublicKeyExtrinsic(users[1], newKey1, currentBlockNumber))(),
      ]).signAndSend();
    } catch (e) {
      // no-op
    }

    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();
    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    app.useGlobalPipes(new ValidationPipe());
    app.enableShutdownHooks();
    await app.init();
    HTTP_SERVER = app.getHttpServer();
  });

  afterAll(async () => {
    for (const u of users) {
      await removeExtraKeysFromMsa(u);
    }
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
      const keysRequest: KeysRequest = {
        msaOwnerAddress: user.keypair.address,
        msaOwnerSignature: ownerProof.Sr25519,
        newKeyOwnerSignature: newKeyProof.Sr25519,
        payload: {
          ...(payload as Required<AddKeyData>),
          msaId: payload.msaId!.toString(),
        },
      };

      await request(app.getHttpServer())
        .post('/v1/keys/add')
        .send(keysRequest)
        .expect(200)
        .expect((req) => req.text === 'Successfully added key.');
    });
  });

  describe('GET tests', () => {
    it('(GET) /keys/:msaId with valid msaId and multiple keys', async () => {
      // users[0] should have 2 keys based on our setup
      const user = users[0];
      const validMsaId = user.msaId!.toString();
      await request(app.getHttpServer())
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
      await request(app.getHttpServer())
        .get(`/v1/keys/${validMsaId}`)
        .expect(200)
        .expect({ msaKeys: [user.keypair.address] });
    });

    it('(GET) /keys/:msaId with invalid msaId', async () => {
      const invalidMsaId = BigInt(maxMsaId) + 1000n;
      await request(app.getHttpServer())
        .get(`/v1/keys/${invalidMsaId.toString()}`)
        .expect(400)
        .expect({ statusCode: 400, message: 'Failed to find public keys for the given msaId' });
    });
  });
});
