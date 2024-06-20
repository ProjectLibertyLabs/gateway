/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ChainUser, ExtrinsicHelper, getClaimHandlePayload } from '@amplica-labs/frequency-scenario-template';
import { uniqueNamesGenerator, colors, names } from 'unique-names-generator';
import { ApiModule } from '../src/api.module';
import { setupProviderAndUsers } from './e2e-setup.mock.spec';

let HTTP_SERVER: any = process.env.HTTP_SERVER || 'http://0.0.0.0:3000';

describe('Handles Controller', () => {
  let app: INestApplication;
  let module: TestingModule;
  let users: ChainUser[];
  let provider: ChainUser;
  let currentBlockNumber: number;
  const handles = new Array(2)
    .fill(0)
    .map(() => uniqueNamesGenerator({ dictionaries: [colors, names], separator: '', length: 2, style: 'capital' }));
  let maxMsaId: string;

  beforeAll(async () => {
    ({ provider, users, currentBlockNumber, maxMsaId } = await setupProviderAndUsers());

    const handlePayloads = users.slice(0, 2).map((u) => getClaimHandlePayload(u, handles[0], currentBlockNumber));

    // Make sure handles for our test users are in a known state:
    // users[0] & users[1] have known handles (baseHandle = handles[0])
    // users[2] & users[3] have no handle
    try {
      await Promise.allSettled([
        ...users.map((u) => ExtrinsicHelper.retireHandle(u.keypair).signAndSend()),
        ExtrinsicHelper.claimHandleWithProvider(
          users[0].keypair,
          provider.keypair,
          handlePayloads[0].proof,
          handlePayloads[0].payload,
        ).payWithCapacity(),
        ExtrinsicHelper.claimHandleWithProvider(
          users[1].keypair,
          provider.keypair,
          handlePayloads[1].proof,
          handlePayloads[1].payload,
        ).payWithCapacity(),
      ]);
    } catch (e) {
      // do nothing
      console.error(e);
    }

    const handle = await ExtrinsicHelper.apiPromise.rpc.handles.getHandleForMsa(users[0].msaId);
    if (handle.isNone) {
      console.error('No handle found when handle should have been claimed');
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
    // Clean up/retire any allocated handles
    try {
      await Promise.allSettled(users.map((u) => ExtrinsicHelper.retireHandle(u.keypair).signAndSend()));
    } catch (e) {
      // do nothing
    }
  });

  describe('Publishes Handle', () => {
    // TODO: once webhook is working, add to test so that we can check the data that comes back
    // potential cases: successful creation, handle already exists for msa, successful change, bad expiration, etc.

    it('(POST) /handles creates new handle', async () => {
      // Use users[2], known to have no handle
      const user = users[2];
      const { payload, proof } = getClaimHandlePayload(user, handles[0], currentBlockNumber);
      const accountId = user.keypair.address;

      await request(HTTP_SERVER)
        .post('/handles')
        .send({ accountId, payload, proof })
        .expect(200)
        .expect((req) => req.text === 'Handle created successfully');
    });

    it('(POST) /handles/change changes the handle', async () => {
      // Use users[1], known to have an existing handle
      const user = users[1];
      const { payload, proof } = getClaimHandlePayload(user, handles[1], currentBlockNumber);
      const accountId = user.keypair.address;

      await request(HTTP_SERVER)
        .post('/handles/change')
        .send({ accountId, payload, proof })
        .expect(200)
        .expect((res) => res.text === 'Handle created successfully');
    });
  });

  describe('Gets Handle', () => {
    it('(GET) /handles/:msaId with valid delegator msaId', async () => {
      // Use users[0], with a known base handle
      const user = users[0];
      const validMsaId = user.msaId?.toString();
      await request(HTTP_SERVER)
        .get(`/handles/${validMsaId}`)
        .expect(200)
        .expect((res) => res.body.base_handle === handles[0])
        .expect((res) => res.body.canonical_base.length === res.body.base_handle.length);
    });
    it('(GET) /handles/:msaId with valid msaId, but undefined handle', async () => {
      // User users[3], known to have no handle
      const user = users[3];
      const msaIdWithNoHandle = user.msaId?.toString();
      await request(HTTP_SERVER)
        .get(`/handles/${msaIdWithNoHandle}`)
        .expect(404)
        .expect({ statusCode: 404, message: 'No handle found for MSA' });
    });

    it('(GET) /handles/:msaId with invalid msaId', async () => {
      const invalidMsaId = BigInt(maxMsaId) + 1000n;
      await request(HTTP_SERVER)
        .get(`/handles/${invalidMsaId.toString()}`)
        .expect(400)
        .expect({ statusCode: 400, message: 'Invalid msaId.' });
    });
  });
});
