/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ChainUser, Schema, SchemaBuilder } from '@projectlibertylabs/frequency-scenario-template';
import { ApiModule } from '../src/api.module';
import { setupProviderAndUsers } from './e2e-setup.mock.spec';
import { RevokeDelegationPayloadRequestDto } from '#account-lib/types/dtos/revokeDelegation.request.dto';
import { u8aToHex } from '@polkadot/util';

let users: ChainUser[];
let provider: ChainUser;
let maxMsaId: string;
let updateSchema: Schema | undefined;
let publicKeySchema: Schema | undefined;
let publicFollowsSchema: Schema | undefined;
let privateFollowsSchema: Schema | undefined;
let privateConnectionsSchema: Schema | undefined;

describe('Delegation Controller', () => {
  let app: INestApplication;
  let module: TestingModule;
  beforeEach(async () => {
    ({ maxMsaId, provider, users } = await setupProviderAndUsers());
    const builder = new SchemaBuilder().withAutoDetectExistingSchema();
    updateSchema = await builder.withName('dsnp', 'update').resolve();
    publicKeySchema = await builder.withName('dsnp', 'public-key-key-agreement').resolve();
    publicFollowsSchema = await builder.withName('dsnp', 'public-follows').resolve();
    privateFollowsSchema = await builder.withName('dsnp', 'private-follows').resolve();
    privateConnectionsSchema = await builder.withName('dsnp', 'private-connections').resolve();

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

  it('(GET) /v1/delegation/:msaId with invalid msaId', async () => {
    const invalidMsaId = BigInt(maxMsaId) + 1000n;
    await request(app.getHttpServer()).get(`/v1/delegation/${invalidMsaId.toString()}`).expect(400).expect({
      statusCode: 400,
      message: 'Failed to find the delegation',
    });
  });

  it('(GET) /v1/delegation/:msaId with a valid MSA that has no delegations', async () => {
    const validMsaId = provider.msaId?.toString(); // use provider's MSA; will have no delegations
    await request(app.getHttpServer()).get(`/v1/delegation/${validMsaId}`).expect(400).expect({
      statusCode: 400,
      message: 'Failed to find the delegation',
    });
  });

  it('(GET) /v1/delegation/:msaId with valid msaId that has delegations', async () => {
    const validMsaId = users[0]?.msaId?.toString();
    await request(app.getHttpServer())
      .get(`/v1/delegation/${validMsaId}`)
      .expect(200)
      .expect({
        providerId: provider.msaId?.toString(),
        schemaPermissions: {
          [updateSchema!.id.toString()]: 0,
          [publicKeySchema!.id.toString()]: 0,
          [publicFollowsSchema!.id.toString()]: 0,
          [privateFollowsSchema!.id.toString()]: 0,
          [privateConnectionsSchema!.id.toString()]: 0,
        },
        revokedAt: '0x00000000',
      });
  });

  it('(POST) /v1/delegation/revokeDelegation/:accountId/:providerId', async () => {
    const providerId = provider.msaId?.toString();
    const { keypair } = users[1];
    const accountId = keypair.address;
    const getPath: string = `/v1/delegation/revokeDelegation/${accountId}/${providerId}`;
    const getRevokeDelegationPayloadResponse = await request(app.getHttpServer()).get(getPath).expect(200);
    console.log(`RevokeDelegationPayloadResponse.body = ${JSON.stringify(getRevokeDelegationPayloadResponse.body)}`);
    const { data } = getRevokeDelegationPayloadResponse.body.payloadToSign;

    const signature: Uint8Array = keypair.sign(data, { withType: true });
    console.log(`signature = ${u8aToHex(signature)}`);

    const revokeDelegationRequest: RevokeDelegationPayloadRequestDto = {
      accountId,
      providerId,
      encodedExtrinsic: getRevokeDelegationPayloadResponse.body.encodedExtrinsic,
      payloadToSign: data,
      signature: u8aToHex(signature),
    };
    console.log(`revokeDelegationRequest = ${JSON.stringify(revokeDelegationRequest)}`);

    // TODO: This test is failing with a 400 error.
    const postPath = '/v1/delegation/revokeDelegation';
    await request(app.getHttpServer()).post(postPath).send(revokeDelegationRequest).expect(HttpStatus.CREATED);
  });
});
