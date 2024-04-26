/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { KeysRequest } from '#lib/types/dtos/keys.request.dto';
import { ApiModule } from '../src/api.module';

describe('Keys Controller', () => {
  let app: INestApplication;
  let module: TestingModule;
  beforeEach(async () => {
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
  });

  // TODO: this requires resetting the chain. Eventually, should make dyncamic.
  it('(POST) /keys/add adds a key to an msa', async () => {
    // MsaOwner is Bob
    const msaOwnerAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
    const payload: KeysRequest['payload'] = {
      msaId: 2,
      expiration: 65,
      // newPublicKey is Ferdie
      newPublicKey: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL',
    };

    const msaOwnerSignature =
      '0xfa02021e8bd76dbd82dbc23961dd45a8507cee81eccf312eba36cc7b20e3af5df424e5d7b51fd572bccaccb2ed5916558f96b8069152c004b13fe0f0e06ca885';

    const newKeyOwnerSignature =
      '0x06e096d636af1d0681bbe299559fb4fb215047e6098fc13a82f276b76bdb8b00a27bf48daec5b2a5849d63061806da650b3f05b36b97d43872d7c9d0d1865d83';

    const keysRequest: KeysRequest = {
      msaOwnerAddress,
      msaOwnerSignature,
      newKeyOwnerSignature,
      payload,
    };

    await request(app.getHttpServer())
      .post('/keys/add')
      .send(keysRequest)
      .expect(200)
      .expect((req) => req.text === 'Successfully added key.');
  });

  it('(GET) /keys/:msaId with valid msaId and multiple keys', async () => {
    const validMsaId = 2;
    await request(app.getHttpServer())
      .get(`/keys/${validMsaId}`)
      .expect(200)
      .expect(['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL']);
  });

  it('(GET) /keys/:msaId with valid msaId and one key', async () => {
    const validMsaId = '3';
    await request(app.getHttpServer())
      .get(`/keys/${validMsaId}`)
      .expect(200)
      .expect(['5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y']);
  });

  it('(GET) /keys/:msaId with invalid msaId', async () => {
    const invalidMsaId = 10;
    await request(app.getHttpServer())
      .get(`/keys/${invalidMsaId}`)
      .expect(400)
      .expect({ statusCode: 400, message: 'Failed to find public keys for the given msaId' });
  });
});
