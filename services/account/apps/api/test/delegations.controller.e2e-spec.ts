/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { ApiModule } from '../src/api.module';

describe('Delegation Controller', () => {
  let app: INestApplication;
  let module: TestingModule;
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

  it('(GET) /delegation/:msaId with invalid msaId', async () => {
    const invalidMsaId = 10;
    await request(app.getHttpServer()).get(`/delegation/${invalidMsaId}`).expect(400).expect({
      statusCode: 400,
      message: 'Failed to find the delegation',
    });
  });

  it('(GET) /delegation/:msaId as a provider', async () => {
    const validMsaId = 1;
    await request(app.getHttpServer()).get(`/delegation/${validMsaId}`).expect(400).expect({
      statusCode: 400,
      message: 'Failed to find the delegation',
    });
  });

  it('(GET) /delegation/:msaId with valid msaId', async () => {
    const validMsaId = 2;
    await request(app.getHttpServer())
      .get(`/delegation/${validMsaId}`)
      .expect(200)
      .expect({
        providerId: '1',
        schemaPermissions: {
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
        },
        revokedAt: '0x00000000',
      });
  });
});
