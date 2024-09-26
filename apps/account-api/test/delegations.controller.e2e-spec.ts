/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { HttpStatus, INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ChainUser, ExtrinsicHelper, Schema, SchemaBuilder } from '@projectlibertylabs/frequency-scenario-template';
import { ApiModule } from '../src/api.module';
import { setupProviderAndUsers } from './e2e-setup.mock.spec';
import { CacheMonitorService } from '#cache/cache-monitor.service';
import { u8aToHex } from '@polkadot/util';
import Keyring from '@polkadot/keyring';
import { RevokeDelegationPayloadRequestDto, RevokeDelegationPayloadResponseDto } from '#types/dtos/account';
import { KeyringPair } from '@polkadot/keyring/types';

let users: ChainUser[];
let revokedUser: ChainUser;
let undelegatedUser: ChainUser;
let provider: ChainUser;
let maxMsaId: string;
let updateSchema: Schema | undefined;
let publicKeySchema: Schema | undefined;
let publicFollowsSchema: Schema | undefined;
let privateFollowsSchema: Schema | undefined;
let privateConnectionsSchema: Schema | undefined;
let httpServer: any;
let invalidMsaId: string;
let msaNonProviderId: string;
let nonMsaKeypair: KeyringPair;

describe('Delegation Controller', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    ({ maxMsaId, provider, revokedUser, undelegatedUser, users } = await setupProviderAndUsers());
    const builder = new SchemaBuilder().withAutoDetectExistingSchema();
    updateSchema = await builder.withName('dsnp', 'update').resolve();
    publicKeySchema = await builder.withName('dsnp', 'public-key-key-agreement').resolve();
    publicFollowsSchema = await builder.withName('dsnp', 'public-follows').resolve();
    privateFollowsSchema = await builder.withName('dsnp', 'private-follows').resolve();
    privateConnectionsSchema = await builder.withName('dsnp', 'private-connections').resolve();

    invalidMsaId = (BigInt(maxMsaId) + 100n).toString();
    msaNonProviderId = users[0].msaId.toString();
    nonMsaKeypair = new Keyring({ type: 'sr25519' }).createFromUri('//Alice//invalidUser');

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
    // Enable URL-based API versioning
    app.enableVersioning({
      type: VersioningType.URI,
    });
    await app.init();

    httpServer = app.getHttpServer();

    // Redis timeout keeping test suite alive for too long; disable
    const cacheMonitor = app.get<CacheMonitorService>(CacheMonitorService);
    cacheMonitor.startConnectionTimer = jest.fn();
  });

  afterAll(async () => {
    // Need a dummy task here to give Jest time to register things before shutting down
    await new Promise<void>((resolve) => {
      setImmediate(() => resolve());
    });

    await ExtrinsicHelper.disconnect();
    await app.close();
    await httpServer.close();

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

  describe('(GET) /v1/delegation/:msaId', () => {
    it('(GET) /v1/delegation/:msaId with invalid msaId', async () => {
      await request(httpServer).get(`/v1/delegation/${invalidMsaId}`).expect(HttpStatus.BAD_REQUEST).expect({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to find the delegation',
      });
    });

    it('(GET) /v1/delegation/:msaId with a valid MSA that has no delegations', async () => {
      const validMsaId = provider.msaId?.toString(); // use provider's MSA; will have no delegations
      await request(httpServer).get(`/v1/delegation/${validMsaId}`).expect(HttpStatus.BAD_REQUEST).expect({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to find the delegation',
      });
    });

    it('(GET) /v1/delegation/:msaId with valid msaId that has delegations', async () => {
      const validMsaId = users[0]?.msaId?.toString();
      await request(httpServer)
        .get(`/v1/delegation/${validMsaId}`)
        .expect(HttpStatus.OK)
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

  describe('/v1/delegation/revokeDelegation', () => {
    let delegationObj: RevokeDelegationPayloadResponseDto;

    it('(GET) /v1/delegation/revokeDelegation/:accountId/:providerId with invalid accountId', async () => {
      const providerId = provider.msaId?.toString();
      const { keypair } = users[1];
      const invalidAccountId = `${keypair.address.slice(0, -1)}5H`;
      const getPath: string = `/v1/delegation/revokeDelegation/${invalidAccountId}/${providerId}`;
      await request(httpServer).get(getPath).expect(HttpStatus.BAD_REQUEST).expect({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid accountId',
      });
    });

    it('(GET) /v1/delegation/revokeDelegation/:accountId/:providerId with valid accountId: no msa', async () => {
      const providerId = provider.msaId?.toString();
      const getPath: string = `/v1/delegation/revokeDelegation/${nonMsaKeypair.address}/${providerId}`;
      await request(httpServer).get(getPath).expect(HttpStatus.NOT_FOUND).expect({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'MSA ID for account not found',
      });
    });

    it('(GET) /v1/delegation/revokeDelegation/:accountId/:providerId with invalid providerId', async () => {
      // Test provisioned users are not registered providers
      const { keypair, msaId } = users[1];
      const accountId = keypair.address;
      const getPath: string = `/v1/delegation/revokeDelegation/${accountId}/${msaId}`;
      await request(httpServer).get(getPath).expect(HttpStatus.BAD_REQUEST).expect({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Supplied ID not a Provider',
      });
    });

    it('(GET) /v1/delegation/revokeDelegation/:accountId/:providerId with revoked delegations', async () => {
      const providerId = provider.msaId?.toString();
      const getPath: string = `/v1/delegation/revokeDelegation/${revokedUser.keypair.address}/${providerId}`;
      await request(httpServer).get(getPath).expect(HttpStatus.NOT_FOUND).expect({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Delegation already revoked',
      });
    });

    it('(GET) /v1/delegation/revokeDelegation/:accountId/:providerId with no delegations', async () => {
      const providerId = provider.msaId?.toString();
      const getPath: string = `/v1/delegation/revokeDelegation/${undelegatedUser.keypair.address}/${providerId}`;
      await request(httpServer).get(getPath).expect(HttpStatus.NOT_FOUND).expect({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'No delegations found',
      });
    });

    it('(GET) /v1/delegation/revokeDelegation/:accountId/:providerId', async () => {
      const providerId = provider.msaId?.toString();
      const accountId = users[1].keypair.address;
      const getPath: string = `/v1/delegation/revokeDelegation/${accountId}/${providerId}`;
      const response = await request(httpServer)
        .get(getPath)
        .expect(HttpStatus.OK)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            payloadToSign: expect.stringMatching(/^0x3c04/),
            encodedExtrinsic: expect.stringMatching(/^0x10043c04/),
            accountId: users[1].keypair.address,
            providerId: provider.msaId.toString(),
          }),
        );
      delegationObj = response.body;
    });

    it('(POST) /v1/delegation/revokeDelegation', async () => {
      const { payloadToSign } = delegationObj;

      const signature: Uint8Array = users[1].keypair.sign(payloadToSign, { withType: true });

      const revokeDelegationRequest: RevokeDelegationPayloadRequestDto = {
        ...delegationObj,
        signature: u8aToHex(signature),
      };

      const postPath = '/v1/delegation/revokeDelegation';
      await request(httpServer).post(postPath).send(revokeDelegationRequest).expect(HttpStatus.CREATED);
    });
  });

  describe('/v2/delegations', () => {
    describe('(GET) /v2/delegations/:msaId', () => {
      const path = '/v2/delegations/{msaId}';

      it('should return error on malformed request', async () => {
        await request(httpServer).get(path.replace('{msaId}', 'bad-identifier')).expect(HttpStatus.BAD_REQUEST);
      });

      it('should return an error for a non-MSA request', async () => {
        await request(httpServer).get(path.replace('{msaId}', invalidMsaId)).expect(HttpStatus.NOT_FOUND);
      });

      it('should return empty list for un-delegated user', async () => {
        await request(httpServer)
          .get(path.replace('{msaId}', undelegatedUser.msaId.toString()))
          .expect(HttpStatus.OK)
          .expect(({ body }) =>
            expect(body).toMatchObject({ msaId: undelegatedUser.msaId.toString(), delegations: [] }),
          );
      });

      it('should return active delegations', async () => {
        await request(httpServer)
          .get(path.replace('{msaId}', users[0].msaId.toString()))
          .expect(HttpStatus.OK)
          .expect(({ body }) =>
            expect(body).toMatchObject({
              msaId: users[0].msaId.toString(),
              delegations: [{ providerId: provider.msaId.toString() }],
            }),
          )
          .expect(({ body }) => expect(body.delegations[0]).not.toMatchObject({ revokedAtBlock: expect.any }));
      });

      it('should return inactive delegations', async () => {
        await request(httpServer)
          .get(path.replace('{msaId}', revokedUser.msaId.toString()))
          .expect(HttpStatus.OK)
          .expect(({ body }) =>
            expect(body).toMatchObject({
              msaId: revokedUser.msaId.toString(),
              delegations: [{ providerId: provider.msaId.toString(), revokedAtBlock: expect.any(Number) }],
            }),
          )
          .expect(({ body }) => expect(body.delegations[0].revokedAtBlock).toBeGreaterThan(0));
      });
    });

    describe('(GET) /v2/delegations/:msaId/:providerId', () => {
      const path = '/v2/delegations/{msaId}/{providerId}';

      it('should return error on malformed request', async () => {
        await request(httpServer).get(path.replace('{msaId}', 'bad-identifier')).expect(HttpStatus.BAD_REQUEST);
        await request(httpServer)
          .get(path.replace('{msaId}', users[0].msaId.toString()).replace('{providerId}', 'bad-identifier'))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should return an error for a non-MSA user', async () => {
        await request(httpServer)
          .get(path.replace('{msaId}', invalidMsaId).replace('{providerId}', provider.msaId.toString()))
          .expect(HttpStatus.NOT_FOUND);
      });

      it('should return an error for a non-MSA provider', async () => {
        await request(httpServer)
          .get(path.replace('{msaId}', users[0].msaId.toString()).replace('{providerId}', invalidMsaId))
          .expect(HttpStatus.NOT_FOUND);
      });

      it('should return an error for a providerId that is not a registered provider', async () => {
        await request(httpServer)
          .get(path.replace('{msaId}', users[0].msaId.toString()).replace('{providerId}', msaNonProviderId))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should return NOT_FOUND for un-delegated user', async () => {
        await request(httpServer)
          .get(
            path
              .replace('{msaId}', undelegatedUser.msaId.toString())
              .replace('{providerId}', provider.msaId.toString()),
          )
          .expect(HttpStatus.NOT_FOUND);
      });

      it('should return active delegations', async () => {
        await request(httpServer)
          .get(path.replace('{msaId}', users[0].msaId.toString()).replace('{providerId}', provider.msaId.toString()))
          .expect(HttpStatus.OK)
          .expect(({ body }) =>
            expect(body).toMatchObject({
              msaId: users[0].msaId.toString(),
              delegations: [{ providerId: provider.msaId.toString() }],
            }),
          )
          .expect(({ body }) => expect(body.delegations[0]).not.toMatchObject({ revokedAtBlock: expect.any }));
      });

      it('should return inactive delegations', async () => {
        await request(httpServer)
          .get(path.replace('{msaId}', revokedUser.msaId.toString()).replace('{providerId}', provider.msaId.toString()))
          .expect(HttpStatus.OK)
          .expect(({ body }) =>
            expect(body).toMatchObject({
              msaId: revokedUser.msaId.toString(),
              delegations: [{ providerId: provider.msaId.toString(), revokedAtBlock: expect.any(Number) }],
            }),
          )
          .expect(({ body }) => expect(body.delegations[0].revokedAtBlock).toBeGreaterThan(0));
      });
    });
  });
});
