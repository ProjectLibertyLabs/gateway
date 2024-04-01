/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import request from 'supertest';

describe('Handles Controller', () => {
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

  it('(POST) /handles creates new account', async () => {
    await request(app.getHttpServer())
      .post('/handles')
      .expect(200)
      .expect((req) => req.text === 'Account created successfully');
  });

  it('(GET) /handles/:msaId with valid msaId', async () => {
    const validMsaId = '1';
    await request(app.getHttpServer())
      .get('/handles/' + validMsaId)
      .expect(200)
      .expect({
        msaId: '1',
        handle: {
          base_handle: 'AliceHandle',
          canonical_base: 'a11cehand1e',
          suffix: 85,
        },
      });
  });

  it('(GET) /handles/:msaId with valid msaId, but undefined handle', async () => {
    const msaIdWithNoHandle = '2';
    await request(app.getHttpServer())
      .get('/handles/' + msaIdWithNoHandle)
      .expect(400)
      .expect({ statusCode: 400, message: 'Failed to find the handle.' });
  });

  it('(GET) /handles/:msaId with invalid msaId', async () => {
    const invalidMsaId = '10';
    await request(app.getHttpServer())
      .get('/handles/' + invalidMsaId)
      .expect(400)
      .expect({ statusCode: 400, message: 'Failed to find the handle.' });
  });
});
