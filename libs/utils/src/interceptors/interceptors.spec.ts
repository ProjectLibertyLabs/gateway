import { Controller, Get, HttpStatus, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';

@Controller()
class TestController {
  // eslint-disable-next-line class-methods-use-this
  @Get('/timeout')
  public async timeoutTest() {
    jest.advanceTimersByTime(5000);
  }

  // eslint-disable-next-line class-methods-use-this
  @Get('/notimeout')
  public notimeout() {}
}

describe('Timeout Interceptor Tests', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let httpServer: any;
  let interceptor;

  beforeAll(async () => {
    jest.useFakeTimers();
    module = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below to see logs when debugging tests
    module.useLogger(new Logger());

    interceptor = new TimeoutInterceptor(1000);
    app.useGlobalInterceptors(interceptor);

    await app.init();

    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await httpServer.close();
  });

  it('(GET) /timeout should return OK if request completes in time', async () => {
    request(httpServer).get('/notimeout').expect(HttpStatus.OK);
  });

  it(
    '(GET) /timeout should time out if request is taking too long',
    async () =>
      request(httpServer)
        .get('/timeout')
        .expect(HttpStatus.REQUEST_TIMEOUT)
        .expect({ statusCode: HttpStatus.REQUEST_TIMEOUT, message: 'Request Timeout' }),
    6000,
  );

  it('(GET) /timeout should log the route if a timeout exception is thrown', async () => {
    // eslint-disable-next-line prefer-destructuring
    const logger: Logger = (interceptor as unknown as any).logger;
    const logSpy = jest.spyOn(logger, 'error');
    await request(httpServer).get('/timeout');
    expect(logSpy).toHaveBeenCalledWith(expect.any(String), expect.stringMatching('/timeout'));
  });
});
