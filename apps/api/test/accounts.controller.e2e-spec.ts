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

describe('Account Controller', () => {
  let app: INestApplication;
  let module: TestingModule;
  let currentBlockNumber: number;
  let users: ChainUser[];
  let provider: ChainUser;
  let maxMsaId: string;
  const handle = uniqueNamesGenerator({ dictionaries: [colors, names], separator: '', length: 2, style: 'capital' });
  let actualHandle: string;

  beforeEach(async () => {
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
    } else {
      actualHandle = claimedHandle.unwrap().displayHandle;
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
  });

  afterAll(async () => {
    // Retire all claimed handles
    try {
      await Promise.allSettled(users.map((u) => ExtrinsicHelper.retireHandle(u.keypair).signAndSend()));
    } catch (e) {
      // do nothing
      console.error(e);
    }
  });

  it('(GET) /v1/accounts/:msaId with valid msaId and no handle', async () => {
    const user = users[1];
    const validMsaId = user.msaId?.toString();
    await request(app.getHttpServer()).get(`/v1/accounts/${validMsaId}`).expect(200).expect({
      msaId: user.msaId?.toString(),
    });
  });

  it('(GET) /v1/accounts/:msaId with invalid msaId', async () => {
    const invalidMsaId = BigInt(maxMsaId) + 1000n;
    await request(app.getHttpServer())
      .get(`/v1/accounts/${invalidMsaId.toString()}`)
      .expect(400)
      .expect({ statusCode: 400, message: 'Failed to find the account' });
  });

  it('(GET) /v1/accounts/:msaId with valid msaId and handle', async () => {
    const user = users[0];
    const validMsaId = user.msaId?.toString();
    await request(app.getHttpServer())
      .get(`/v1/accounts/${validMsaId}`)
      .expect(200)
      .expect((res) => res.body.msaId === validMsaId)
      .expect((res) => res.body.displayHandle === actualHandle);
  });
});
