import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ChainUser, ExtrinsicHelper } from '@projectlibertylabs/frequency-scenario-template';
import { ApiModule } from '../src/api.module';
import { setupProviderAndUsers } from '#testlib/e2e-setup.mock.spec';
import { CacheMonitorService } from '#cache/cache-monitor.service';
import { u8aToHex } from '@polkadot/util';
import Keyring from '@polkadot/keyring';
import { RevokeDelegationPayloadRequestDto, RevokeDelegationPayloadResponseDto } from '#types/dtos/account';
import { KeyringPair } from '@polkadot/keyring/types';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';

let users: ChainUser[];
let revokedUser: ChainUser;
let undelegatedUser: ChainUser;
let provider: ChainUser;
let maxMsaId: string;
let httpServer: any;
let invalidMsaId: string;
let msaNonProviderId: string;
let nonMsaKeypair: KeyringPair;

describe('Delegation Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;

  beforeAll(async () => {
    ({ maxMsaId, provider, revokedUser, undelegatedUser, users } = await setupProviderAndUsers());

    invalidMsaId = (BigInt(maxMsaId) + 100n).toString();
    msaNonProviderId = users[0].msaId.toString();
    nonMsaKeypair = new Keyring({ type: 'sr25519' }).createFromUri('//Alice//invalidUser');

    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below and set ENABLE_LOGS_IN_TESTS=true in the environment to see logs when debugging tests
    // module.useLogger(app.get(Logger));

    const config = app.get<IAccountApiConfig>(apiConfig.KEY);
    useContainer(module, { fallbackOnErrors: true });
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

  describe('/v3/delegations', () => {
    describe('Revoke Delegation', () => {
      let delegationObj: RevokeDelegationPayloadResponseDto;

      describe('(GET) /v3/delegations/revokeDelegation/:accountId/:providerId', () => {
        it('invalid accountId should fail', async () => {
          const providerId = provider.msaId?.toString();
          const { keypair } = users[1];
          const invalidAccountId = `${keypair.address.slice(0, -1)}5H`;
          const getPath: string = `/v3/delegations/revokeDelegation/${invalidAccountId}/${providerId}`;
          await request(httpServer)
            .get(getPath)
            .expect(HttpStatus.BAD_REQUEST)
            .expect((res) =>
              expect(res.text).toContain(
                'accountId should be a valid 32 bytes representing an account Id or address in Hex or SS58 format',
              ),
            );
        });

        it('valid, but non-existent accountId should fail', async () => {
          const providerId = provider.msaId?.toString();
          const getPath: string = `/v3/delegations/revokeDelegation/${nonMsaKeypair.address}/${providerId}`;
          await request(httpServer)
            .get(getPath)
            .expect(HttpStatus.NOT_FOUND)
            .expect((res) => expect(res.text).toContain('not found'));
        });

        it('invalid providerId should fail', async () => {
          // Test provisioned users are not registered providers
          const { keypair, msaId } = users[1];
          const accountId = keypair.address;
          const getPath: string = `/v3/delegations/revokeDelegation/${accountId}/${msaId}`;
          await request(httpServer)
            .get(getPath)
            .expect(HttpStatus.BAD_REQUEST)
            .expect((res) => expect(res.text).toContain('Supplied ID not a Provider'));
        });

        it('already revoked delegation should fail', async () => {
          const providerId = provider.msaId?.toString();
          const getPath: string = `/v3/delegations/revokeDelegation/${revokedUser.keypair.address}/${providerId}`;
          await request(httpServer)
            .get(getPath)
            .expect(HttpStatus.BAD_REQUEST)
            .expect((res) => expect(res.text).toContain('Delegation already revoked'));
        });

        it('with no existing delegations should fail', async () => {
          const providerId = provider.msaId?.toString();
          const getPath: string = `/v3/delegations/revokeDelegation/${undelegatedUser.keypair.address}/${providerId}`;
          await request(httpServer)
            .get(getPath)
            .expect(HttpStatus.NOT_FOUND)
            .expect((res) => expect(res.text).toContain('No delegations found'));
        });

        it('valid revocation request should succeed', async () => {
          const providerId = provider.msaId?.toString();
          const accountId = users[1].keypair.address;
          const getPath: string = `/v3/delegations/revokeDelegation/${accountId}/${providerId}`;
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
      });

      describe('(POST) /v3/delegations/revokeDelegation', () => {
        it('post extrinsic payload should succeed', async () => {
          const { payloadToSign } = delegationObj;

          const signature: Uint8Array = users[1].keypair.sign(payloadToSign, { withType: true });

          const revokeDelegationRequest: RevokeDelegationPayloadRequestDto = {
            ...delegationObj,
            signature: u8aToHex(signature),
          };

          const postPath = '/v3/delegations/revokeDelegation';
          await request(httpServer).post(postPath).send(revokeDelegationRequest).expect(HttpStatus.CREATED);
        });
      });
    });

    describe('(GET) /v3/delegations/:msaId', () => {
      const path = '/v3/delegations/{msaId}';

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

    describe('(GET) /v3/delegations/:msaId/:providerId', () => {
      const path = '/v3/delegations/{msaId}/{providerId}';

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
