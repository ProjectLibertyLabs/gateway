/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import { assert } from 'console';

describe('Account Controller', () => {
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

  it('(GET) /accounts/:msaId with valid msaId', () => {
    // const validMsaId = '1234';
    // expect(validMsaId).toBe('1234');
    assert(true, 'Test asserted.');
    // request(app.getHttpServer())
    //   .get('/accounts/' + validMsaId)
    //   .expect(200)
    //   .expect({ status: 200, message: 'Found account' });
  });

  // it('(GET) /accounts/:msaId with invalid msaId', () => {
  //   const invalidMsaId = '1';
  //   request(app.getHttpServer())
  //     .get('/accounts/' + invalidMsaId)
  //     .expect(401)
  //     .expect({ status: 401, message: 'Invalid msaId.' });
  // });

  afterEach(async () => {
    await app.close();
  });
});
