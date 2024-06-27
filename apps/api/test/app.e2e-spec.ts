/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import { ConnectionDto, GraphKeyPairDto, GraphsQueryParamsDto, KeyType, PrivacyType, ProviderGraphDto } from '../../../libs/common/src';
import { Direction } from '../../../libs/common/src/dtos/direction.enum';
import { ConnectionType } from '../../../libs/common/src/dtos/connection-type.enum';
import { ChainUser, ExtrinsicHelper } from '@amplica-labs/frequency-scenario-template';
import { setupProviderAndUsers } from './e2e-setup.mock.spec';
import { u8aToHex } from '@polkadot/util';

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
  });

  afterAll(async () => {
    await app.close();
    await ExtrinsicHelper.disconnect();
  });

  it('(GET) /api/health', () => request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 200, message: 'Service is healthy' }));

  describe('(POST) /api/update-graph', () => {
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
        .post(`/api/update-graph`)
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
          .post(`/api/update-graph`)
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
        .post(`/api/update-graph`)
        .send(validGraphChangeRequest)
        .expect(201)
        .expect((res) => expect(res.text).toContain('referenceId'));
    });

    it('Get graph request should work', async () => {
      const userGraphGet: GraphsQueryParamsDto = {
        dsnpIds: [users[0].msaId!.toString()],
        privacyType: PrivacyType.Public,
      } as GraphsQueryParamsDto;

      await request(app.getHttpServer())
        .put(`/api/graphs`)
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
        .put(`/api/graphs`)
        .send(userGraphGet)
        .expect(200)
        .expect((res) => expect(res.body[0].dsnpId).toBe(users[0].msaId!.toString()));
    });
  });

  describe('(POST) /api/update-graph with public disconnect', () => {
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
        .post(`/api/update-graph`)
        .send(validGraphChangeRequest)
        .expect(201)
        .expect((res) => expect(res.text).toContain('referenceId'));
    });
  });

  describe('(POST) /api/update-graph with private disconnect', () => {
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
        .post(`/api/update-graph`)
        .send(validGraphChangeRequest)
        .expect(201)
        .expect((res) => expect(res.text).toContain('referenceId'));
    });
  });

  describe('(POST) /api/update-graph with private friend request user A -> B', () => {
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
        .post(`/api/update-graph`)
        .send(validGraphChangeRequest)
        .expect(201)
        .expect((res) => expect(res.text).toContain('referenceId'));
    });
  });

  describe('(POST) /api/update-graph with private friend request from user B -> A', () => {
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
        .post(`/api/update-graph`)
        .send(validGraphChangeRequest)
        .expect(201)
        .expect((res) => expect(res.text).toContain('referenceId'));
    });
  });
  describe('(POST) /api/update-graph with bi-directional connection', () => {
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
        .post(`/api/update-graph`)
        .send(validGraphChangeRequest)
        .expect(201)
        .expect((res) => expect(res.text).toContain('referenceId'));
    });
  });
});
