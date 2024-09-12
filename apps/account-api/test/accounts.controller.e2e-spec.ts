/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ChainUser, ExtrinsicHelper, getClaimHandlePayload } from '@projectlibertylabs/frequency-scenario-template';
import { uniqueNamesGenerator, colors, names } from 'unique-names-generator';
import { ApiModule } from '../src/api.module';
import { getRawPayloadForSigning, getSignerForRawSignature, setupProviderAndUsers } from './e2e-setup.mock.spec';
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { SignerPayloadRaw, SignerResult, Signer } from '@polkadot/types/types';
import { RetireMsaRequestDto } from '#account-lib/types/dtos/accounts.request.dto';
import { RetireMsaPayloadResponseDto } from '#account-lib/types/dtos';

describe('Account Controller', () => {
  let app: INestApplication;
  let module: TestingModule;
  let currentBlockNumber: number;
  let users: ChainUser[];
  let provider: ChainUser;
  let maxMsaId: string;
  const handle = uniqueNamesGenerator({ dictionaries: [colors, names], separator: '', length: 2, style: 'capital' });

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
    const user = users[2];
    const validMsaId = user.msaId?.toString();
    await request(app.getHttpServer()).get(`/v1/accounts/${validMsaId}`).expect(200).expect({
      msaId: user.msaId?.toString(),
    });
  });

  it('(GET) /v1/accounts/:msaId with invalid msaId', async () => {
    const invalidMsaId = BigInt(maxMsaId) + 1000n;
    await request(app.getHttpServer())
      .get(`/v1/accounts/${invalidMsaId.toString()}`)
      .expect(404)
      .expect({ statusCode: 404, message: 'Failed to find the account' });
  });

  it('(GET) /v1/accounts/:msaId with valid msaId and handle', async () => {
    const user = users[0];
    const validMsaId = user.msaId?.toString();
    await request(app.getHttpServer())
      .get(`/v1/accounts/${validMsaId}`)
      .expect(200)
      .expect((res) => res.body.msaId === validMsaId)
      .expect((res) => res.body.handle.base_handle === handle);
  });

  it('(GET) /v1/accounts/retireMsa/:accountId get payload for retireMsa, given a valid accountId', async () => {
    const accountId = users[0].keypair.address;
    const path = `/v1/accounts/retireMsa/${accountId}`;

    const expectedSignerPayloadResult: SignerPayloadRaw = {
      address: accountId,
      data: '0x3c0ac40000005e0000000100000085f854538489ccf7ebbc59e571bf44a207fd007505db84234a51120688e44f0bb0ffe32b3a6e80195781b56bb94ae41c9c7fadc4ecf27bc488c32dfac3c3b31c',
      type: 'payload',
    };
    const expectedEncodedDataResult: string =
      '0x3c0ac40000005e0000000100000085f854538489ccf7ebbc59e571bf44a207fd007505db84234a51120688e44f0bb0ffe32b3a6e80195781b56bb94ae41c9c7fadc4ecf27bc488c32dfac3c3b31c';

    await request(app.getHttpServer())
      .get(path)
      .expect(200)
      .expect((res) => res.body.signerPayload === expectedSignerPayloadResult)
      .expect((res) => res.body.encodedPayload === expectedEncodedDataResult);
  });

  it('(GET) /v1/accounts/retireMsa/:accountId get payload for retireMsa, given an invalid accountId', async () => {
    const accountId = '0x123';
    const path = `/v1/accounts/retireMsa/${accountId}`;
    await request(app.getHttpServer()).get(path).expect(400);
  });

  it('(POST) /v1/accounts/retireMsa post retireMsa', async () => {
    const { keypair } = users[1];
    const accountId = keypair.address;
    const getPath: string = `/v1/accounts/retireMsa/${accountId}`;
    const getRetireMsaResponse = await request(app.getHttpServer()).get(getPath);
    const responseData: RetireMsaPayloadResponseDto = getRetireMsaResponse.body;

    await cryptoWaitReady();
    const tx = ExtrinsicHelper.apiPromise.tx.msa.retireMsa();
    const signerPayload: SignerPayloadRaw = await getRawPayloadForSigning(tx, accountId);
    const { data } = signerPayload;
    const signature: Uint8Array = keypair.sign(data, { withType: true });
    const prefixedSignature: SignerResult = { id: 1, signature: u8aToHex(signature) };
    const signer: Signer = getSignerForRawSignature(prefixedSignature);

    const retireMsaRequest: RetireMsaRequestDto = {
      signerPayload: responseData.signerPayload,
      encodedPayload: responseData.encodedPayload,
      signer,
      accountId,
    };

    const postPath: string = '/v1/accounts/retireMsa';
    await request(app.getHttpServer()).post(postPath).send(retireMsaRequest).expect(HttpStatus.CREATED);
  });
});
