/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChainUser, ExtrinsicHelper } from '@amplica-labs/frequency-scenario-template';
import { setupProviderAndUsers } from './e2e-setup.mock.spec';
import { u8aToHex } from '@polkadot/util';
import { ApiModule } from '#api/api.module';
import { ProviderGraphDto, ConnectionDto, KeyType, GraphKeyPairDto, GraphsQueryParamsDto, Direction } from '#lib/dtos';
import { PrivacyType, ConnectionType } from '@dsnp/graph-sdk';
import { MILLISECONDS_PER_SECOND } from 'time-constants';

let app: INestApplication;
let testModule: TestingModule;
let users: ChainUser[];
let eventEmitter: EventEmitter2;

describe('Graph Service E2E request verification!', () => {
  beforeAll(async () => {
    ({ users } = await setupProviderAndUsers());
    testModule = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = testModule.createNestApplication();
    eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    app.useGlobalPipes(new ValidationPipe());
    app.enableShutdownHooks();
    await app.init();
  }, 60 * MILLISECONDS_PER_SECOND);

  afterAll(async () => {
    await app.close();
    await ExtrinsicHelper.disconnect();
  });

  describe('Health endpoints', () => {
    it('(GET) /healthz', () => request(app.getHttpServer()).get('/healthz').expect(200).expect({ status: 200, message: 'Service is healthy' }));

    it('(GET) /livez', () => request(app.getHttpServer()).get('/livez').expect(200).expect({ status: 200, message: 'Service is live' }));

    it('(GET) /readyz', () => request(app.getHttpServer()).get('/readyz').expect(200).expect({ status: 200, message: 'Service is ready' }));
  });

  describe('/graph endpoints', () => {
    // TODO: Re-enable this test once the setup is update to create user graphs on-chain
    describe.skip('(POST) /v1/graphs retrieves user graphs', () => {
      it('Get graph request should work', async () => {
        const userGraphGet: GraphsQueryParamsDto = {
          dsnpIds: [users[0].msaId!.toString()],
          privacyType: PrivacyType.Public,
        } as GraphsQueryParamsDto;

        await request(app.getHttpServer())
          .post(`/v1/graphs`)
          .send(userGraphGet)
          .expect(200)
          .expect((res) => expect(res.body[0].dsnpId).toBe(users[0].msaId!.toString()));
      });

      it('Get graph request should work with private graph', async () => {
        const userGraphGet: GraphsQueryParamsDto = {
          dsnpIds: [users[0].msaId!.toString()],
          privacyType: PrivacyType.Private,
          graphKeyPairs: [
            {
              keyType: KeyType.X25519,
              publicKey: u8aToHex(users[0].graphKeyPair?.publicKey),
              privateKey: u8aToHex(users[0].graphKeyPair?.secretKey),
            } as GraphKeyPairDto,
          ],
        } as GraphsQueryParamsDto;

        await request(app.getHttpServer())
          .post(`/v1/graphs`)
          .send(userGraphGet)
          .expect(200)
          .expect((res) => expect(res.body[0].dsnpId).toBe(users[0].msaId!.toString()));
      });
    });
  });
  describe('(PUT) /v1/graphs', () => {
    it('Valid public graph update request should work', async () => {
      const validGraphChangeRequest: ProviderGraphDto = {
        dsnpId: users[0].msaId!.toString(),
        connections: {
          data: [
            {
              dsnpId: users[1].msaId!.toString(),
              privacyType: PrivacyType.Public,
              direction: Direction.ConnectionTo,
              connectionType: ConnectionType.Follow,
            } as ConnectionDto,
          ],
        },
      };

      return request(app.getHttpServer())
        .put(`/v1/graphs`)
        .send(validGraphChangeRequest)
        .expect(201)
        .expect((res) => expect(res.text).toContain('referenceId'));
    });

    it('Two Valid public graph update requests should work', async () => {
      const validGraphChangeRequests: ProviderGraphDto[] = [
        {
          dsnpId: users[1].msaId!.toString(),
          connections: {
            data: [
              {
                dsnpId: users[2].msaId!.toString(),
                privacyType: PrivacyType.Public,
                direction: Direction.ConnectionTo,
                connectionType: ConnectionType.Follow,
              } as ConnectionDto,
            ],
          },
        },
        {
          dsnpId: users[2].msaId!.toString(),
          connections: {
            data: [
              {
                dsnpId: users[0].msaId!.toString(),
                privacyType: PrivacyType.Public,
                direction: Direction.ConnectionTo,
                connectionType: ConnectionType.Follow,
              } as ConnectionDto,
            ],
          },
        },
      ];

      const requests = validGraphChangeRequests.map((requestPayload) => {
        console.log(`requestPayload.dsnpId: ${requestPayload.dsnpId}`);
        return request(app.getHttpServer())
          .put(`/v1/graphs`)
          .send(requestPayload)
          .expect(201)
          .expect((res) => expect(res.text).toContain('referenceId'));
      });

      await Promise.all(requests);
    });

    it('Valid private graph update request should work', async () => {
      const validGraphChangeRequest: ProviderGraphDto = {
        dsnpId: users[0].msaId!.toString(),
        connections: {
          data: [
            {
              dsnpId: users[1].msaId!.toString(),
              privacyType: PrivacyType.Private,
              direction: Direction.ConnectionTo,
              connectionType: ConnectionType.Follow,
            } as ConnectionDto,
          ],
        },
        graphKeyPairs: [
          {
            keyType: KeyType.X25519,
            publicKey: u8aToHex(users[0].graphKeyPair?.publicKey),
            privateKey: u8aToHex(users[0].graphKeyPair?.secretKey),
          } as GraphKeyPairDto,
        ],
      };

      return request(app.getHttpServer())
        .put(`/v1/graphs`)
        .send(validGraphChangeRequest)
        .expect(201)
        .expect((res) => expect(res.text).toContain('referenceId'));
    });

    describe('(PUT) /v1/graphs with public disconnect', () => {
      it('Valid public graph update request should work', async () => {
        const validGraphChangeRequest: ProviderGraphDto = {
          dsnpId: users[0].msaId!.toString(),
          connections: {
            data: [
              {
                dsnpId: users[1].msaId!.toString(),
                privacyType: PrivacyType.Public,
                direction: Direction.Disconnect,
                connectionType: ConnectionType.Follow,
              } as ConnectionDto,
            ],
          },
        };

        return request(app.getHttpServer())
          .put(`/v1/graphs`)
          .send(validGraphChangeRequest)
          .expect(201)
          .expect((res) => expect(res.text).toContain('referenceId'));
      });
    });

    describe('(PUT) /v1/graphs with private disconnect', () => {
      it('Valid private graph update request should work', async () => {
        const validGraphChangeRequest: ProviderGraphDto = {
          dsnpId: users[0].msaId!.toString(),
          connections: {
            data: [
              {
                dsnpId: users[1].msaId!.toString(),
                privacyType: PrivacyType.Private,
                direction: Direction.Disconnect,
                connectionType: ConnectionType.Follow,
              } as ConnectionDto,
            ],
          },
          graphKeyPairs: [
            {
              keyType: KeyType.X25519,
              publicKey: u8aToHex(users[0].graphKeyPair?.publicKey),
              privateKey: u8aToHex(users[0].graphKeyPair?.secretKey),
            } as GraphKeyPairDto,
          ],
        };

        return request(app.getHttpServer())
          .put(`/v1/graphs`)
          .send(validGraphChangeRequest)
          .expect(201)
          .expect((res) => expect(res.text).toContain('referenceId'));
      });
    });

    describe('(PUT) /v1/graphs with private friend request user A -> B', () => {
      it('Valid private graph update request should work', async () => {
        const validGraphChangeRequest: ProviderGraphDto = {
          dsnpId: users[0].msaId!.toString(),
          connections: {
            data: [
              {
                dsnpId: users[1].msaId!.toString(),
                privacyType: PrivacyType.Private,
                direction: Direction.ConnectionTo,
                connectionType: ConnectionType.Friendship,
              } as ConnectionDto,
            ],
          },
          graphKeyPairs: [
            {
              keyType: KeyType.X25519,
              publicKey: u8aToHex(users[0].graphKeyPair?.publicKey),
              privateKey: u8aToHex(users[0].graphKeyPair?.secretKey),
            } as GraphKeyPairDto,
          ],
        };

        return request(app.getHttpServer())
          .put(`/v1/graphs`)
          .send(validGraphChangeRequest)
          .expect(201)
          .expect((res) => expect(res.text).toContain('referenceId'));
      });
    });

    describe('(PUT) /v1/graphs with private friend request from user B -> A', () => {
      it('Valid private graph update request should work', async () => {
        const validGraphChangeRequest: ProviderGraphDto = {
          dsnpId: users[1].msaId!.toString(),
          connections: {
            data: [
              {
                dsnpId: users[0].msaId!.toString(),
                privacyType: PrivacyType.Private,
                direction: Direction.ConnectionTo,
                connectionType: ConnectionType.Friendship,
              } as ConnectionDto,
            ],
          },
          graphKeyPairs: [
            {
              keyType: KeyType.X25519,
              publicKey: u8aToHex(users[1].graphKeyPair?.publicKey),
              privateKey: u8aToHex(users[1].graphKeyPair?.secretKey),
            } as GraphKeyPairDto,
          ],
        };

        return request(app.getHttpServer())
          .put(`/v1/graphs`)
          .send(validGraphChangeRequest)
          .expect(201)
          .expect((res) => expect(res.text).toContain('referenceId'));
      });
    });
    describe('(PUT) /v1/graphs with bi-directional connection', () => {
      it('Valid public graph update request should work', async () => {
        const validGraphChangeRequest: ProviderGraphDto = {
          dsnpId: users[0].msaId!.toString(),
          connections: {
            data: [
              {
                dsnpId: users[1].msaId!.toString(),
                privacyType: PrivacyType.Public,
                direction: Direction.Bidirectional,
                connectionType: ConnectionType.Follow,
              } as ConnectionDto,
            ],
          },
        };

        return request(app.getHttpServer())
          .put(`/v1/graphs`)
          .send(validGraphChangeRequest)
          .expect(201)
          .expect((res) => expect(res.text).toContain('referenceId'));
      });
    });
  });

  describe('/v1/webhooks endpoints', () => {
    it.todo('(POST) /v1/webhooks creates a webhook registration');
    it.todo('(GET) /v1/webhooks gets all webhooks');
    it.todo('(GET) /v1/webhooks/users/:msaId gets all webhooks for a particular user');
    it.todo('(GET) /v1/webhooks/urls/:url gets all watched user graphs for a given URL registration');
    it.todo('(DELETE) /v1/webhooks/users/:msaId deletes all webhooks for a given user');
    it.todo('(DELETE) /v1/webhooks/urls?url=<webhook url> deletes watched user graphs for a given webhook URL');
    it.todo('(DELETE) /v1/webhooks clears all registered webhooks');
  });
});
