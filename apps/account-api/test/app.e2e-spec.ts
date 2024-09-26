import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import { CacheMonitorService } from '#account-lib/cache/cache-monitor.service';

describe('Account Service E2E request verification!', () => {
  let app: INestApplication;
  let module: TestingModule;
  let httpServer: any;

  beforeAll(async () => {
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

    httpServer = app.getHttpServer();

    // Redis timeout keeping test suite alive for too long; disable
    const cacheMonitor = app.get<CacheMonitorService>(CacheMonitorService);
    cacheMonitor.startConnectionTimer = jest.fn();
  });

  afterAll(async () => {
    await app.close();
    await httpServer.close();

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

  it('(GET) /healthz', () =>
    request(httpServer).get('/healthz').expect(200).expect({ status: 200, message: 'Service is healthy' }));

  it('(GET) /livez', () =>
    request(httpServer).get('/livez').expect(200).expect({ status: 200, message: 'Service is live' }));

  it('(GET) /readyz', () =>
    request(httpServer).get('/readyz').expect(200).expect({ status: 200, message: 'Service is ready' }));
});
