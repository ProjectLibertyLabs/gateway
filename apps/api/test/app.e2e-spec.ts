/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import { ConnectionDto, GraphKeyPairDto, GraphsQueryParamsDto, KeyType, PrivacyType, ProviderGraphDto } from '../../../libs/common/src';
import { Direction } from '../../../libs/common/src/dtos/direction.dto';
import { ConnectionType } from '../../../libs/common/src/dtos/connection.type.dto';

describe('Graph Service E2E request verification!', () => {
  let app: INestApplication;
  let module: TestingModule;
  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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

  it('(GET) /api/health', () => request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 200, message: 'Service is healthy' }));

  describe('(POST) /api/update-graph', () => {
    it('Valid public graph update request should work', async () => {
      const validGraphChangeRequest: ProviderGraphDto = {
        dsnpId: '2',
        connections: {
          data: [
            {
              dsnpId: '4',
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
          dsnpId: '4',
          connections: {
            data: [
              {
                dsnpId: '5',
                privacyType: PrivacyType.Public,
                direction: Direction.ConnectionTo,
                connectionType: ConnectionType.Follow,
              } as ConnectionDto,
            ],
          },
        },
        {
          dsnpId: '6',
          connections: {
            data: [
              {
                dsnpId: '3',
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
        dsnpId: '2',
        connections: {
          data: [
            {
              dsnpId: '4',
              privacyType: PrivacyType.Private,
              direction: Direction.ConnectionTo,
              connectionType: ConnectionType.Follow,
            } as ConnectionDto,
          ],
        },
        graphKeyPairs: [
          {
            keyType: KeyType.X25519,
            publicKey: '0x993052b57e8695d9124964f69f624fcc2080be7525c65b1acd089dff235a0e02',
            privateKey: '0xf74d39829ac4a814048cbda6b35ee1c3c16fbd2b88f97d552aa344bffb5207a5',
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
        dsnpIds: ['2'],
        privacyType: PrivacyType.Public,
      } as GraphsQueryParamsDto;

      await request(app.getHttpServer())
        .put(`/api/graphs`)
        .send(userGraphGet)
        .expect(200)
        .expect((res) => expect(res.body[0].dsnpId).toBe('2'));
    });

    it('Get graph request should work with private graph', async () => {
      const userGraphGet: GraphsQueryParamsDto = {
        dsnpIds: ['2'],
        privacyType: PrivacyType.Private,
        graphKeyPairs: [
          {
            keyType: KeyType.X25519,
            publicKey: '0x993052b57e8695d9124964f69f624fcc2080be7525c65b1acd089dff235a0e02',
            privateKey: '0xf74d39829ac4a814048cbda6b35ee1c3c16fbd2b88f97d552aa344bffb5207a5',
          } as GraphKeyPairDto,
        ],
      } as GraphsQueryParamsDto;

      await request(app.getHttpServer())
        .put(`/api/graphs`)
        .send(userGraphGet)
        .expect(200)
        .expect((res) => expect(res.body[0].dsnpId).toBe('2'));
    });
  });

  describe('(POST) /api/update-graph with public disconnect', () => {
    it('Valid public graph update request should work', async () => {
      const validGraphChangeRequest: ProviderGraphDto = {
        dsnpId: '2',
        connections: {
          data: [
            {
              dsnpId: '4',
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
        dsnpId: '2',
        connections: {
          data: [
            {
              dsnpId: '4',
              privacyType: PrivacyType.Private,
              direction: Direction.Disconnect,
              connectionType: ConnectionType.Follow,
            } as ConnectionDto,
          ],
        },
        graphKeyPairs: [
          {
            keyType: KeyType.X25519,
            publicKey: '0x993052b57e8695d9124964f69f624fcc2080be7525c65b1acd089dff235a0e02',
            privateKey: '0xf74d39829ac4a814048cbda6b35ee1c3c16fbd2b88f97d552aa344bffb5207a5',
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

  describe('(POST) /api/update-graph with private friend request from 2', () => {
    it('Valid private graph update request should work', async () => {
      const validGraphChangeRequest: ProviderGraphDto = {
        dsnpId: '2',
        connections: {
          data: [
            {
              dsnpId: '3',
              privacyType: PrivacyType.Private,
              direction: Direction.ConnectionTo,
              connectionType: ConnectionType.Friendship,
            } as ConnectionDto,
          ],
        },
        graphKeyPairs: [
          {
            keyType: KeyType.X25519,
            publicKey: '0x993052b57e8695d9124964f69f624fcc2080be7525c65b1acd089dff235a0e02',
            privateKey: '0xf74d39829ac4a814048cbda6b35ee1c3c16fbd2b88f97d552aa344bffb5207a5',
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

  describe('(POST) /api/update-graph with private friend request from 3', () => {
    it('Valid private graph update request should work', async () => {
      const validGraphChangeRequest: ProviderGraphDto = {
        dsnpId: '3',
        connections: {
          data: [
            {
              dsnpId: '2',
              privacyType: PrivacyType.Private,
              direction: Direction.ConnectionTo,
              connectionType: ConnectionType.Friendship,
            } as ConnectionDto,
          ],
        },
        graphKeyPairs: [
          {
            keyType: KeyType.X25519,
            publicKey: '0x993052b57e8695d9124964f69f624fcc2080be7525c65b1acd089dff235a0e02',
            privateKey: '0xf74d39829ac4a814048cbda6b35ee1c3c16fbd2b88f97d552aa344bffb5207a5',
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
        dsnpId: '2',
        connections: {
          data: [
            {
              dsnpId: '5',
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

  afterEach(async () => {
    await app.close();
  });
});
