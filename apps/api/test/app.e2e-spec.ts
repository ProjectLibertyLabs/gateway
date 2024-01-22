/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import { ConnectionDto, GraphKeyPairDto, KeyType, PrivacyType, ProviderGraphDto } from '../../../libs/common/src';
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
  });

  afterEach(async () => {
    await app.close();
  });
});
