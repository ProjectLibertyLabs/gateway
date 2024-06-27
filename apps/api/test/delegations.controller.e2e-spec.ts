/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ChainUser, Schema, SchemaBuilder } from '@amplica-labs/frequency-scenario-template';
import { ApiModule } from '../src/api.module';
import { setupProviderAndUsers } from './e2e-setup.mock.spec';

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

  it('(GET) /delegation/:msaId with invalid msaId', async () => {
    const invalidMsaId = BigInt(maxMsaId) + 1000n;
    await request(app.getHttpServer()).get(`/v1/delegation/${invalidMsaId.toString()}`).expect(400).expect({
      statusCode: 400,
      message: 'Failed to find the delegation',
    });
  });

  it('(GET) /delegation/:msaId with a valid MSA that has no delegations', async () => {
    const validMsaId = provider.msaId?.toString(); // use provider's MSA; will have no delegations
    await request(app.getHttpServer()).get(`/v1/delegation/${validMsaId}`).expect(400).expect({
      statusCode: 400,
      message: 'Failed to find the delegation',
    });
  });

  it('(GET) /delegation/:msaId with valid msaId that has delegations', async () => {
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
});
