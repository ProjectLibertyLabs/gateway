/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletLoginRequestDto } from '#lib/types/dtos/wallet.login.request.dto';
import { ApiModule } from '../src/api.module';

describe('Account Service E2E request verification!', () => {
  let app: INestApplication;
  let module: TestingModule;
  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
  });

  it('(GET) /healthz', () =>
    request(app.getHttpServer()).get('/healthz').expect(200).expect({ status: 200, message: 'Service is healthy' }));

  it('(GET) /livez', () =>
    request(app.getHttpServer()).get('/livez').expect(200).expect({ status: 200, message: 'Service is live' }));

  it('(GET) /readyz', () =>
    request(app.getHttpServer()).get('/readyz').expect(200).expect({ status: 200, message: 'Service is ready' }));

  describe('(POST) /accounts/siwf', () => {
    it('Sign Up With Frequency request should work', async () => {
      const siwfRequest: WalletLoginRequestDto = {
        signIn: {},
        signUp: {
          extrinsics: [
            {
              pallet: 'msa',
              extrinsicName: 'createSponsoredAccountWithDelegation',
              encodedExtrinsic:
                '0xed01043c01b01b4dcafc8a8e73bff98e7558249f53cd0e0e64fa6b8f0159f0913d4874d9360176644186458bad3b00bbd0ac21e6c9bd5a8bed9ced7a772d11a9aac025b47f6559468808e272696f596a02af230951861027c0dc30f7163ecf316838a0723483010000000000000014000000000000000000004d000000',
            },
            {
              pallet: 'handles',
              extrinsicName: 'claimHandle',
              encodedExtrinsic:
                '0xb901044200b01b4dcafc8a8e73bff98e7558249f53cd0e0e64fa6b8f0159f0913d4874d93601225508ae2da9804c60660a150277eb32b2a0f6b9c8f6e07dd6cad799cb31ae1dfb43896f488e9c0b7ec8b530d930b3f9b690683f2765d5def3fee3fc6540d58714656e6464794d000000',
            },
          ],
        },
      };

      return request(app.getHttpServer()).post(`/v1/accounts/siwf`).send(siwfRequest).expect(201);
    });
    it('Sign In With Frequency request should work', async () => {
      const siwfRequest: WalletLoginRequestDto = {
        signIn: {
          siwsPayload: {
            message:
              'localhost wants you to sign in with your Frequency account:\n5Fghb4Wt3sg9cF6Q2Qucp5jXV5pL2U9uaYXwR9R8W8SYe9np\n\nThe domain localhost wants you to sign in with your Frequency account via localhost\n\nURI: http://localhost:5173/signin/confirm\nNonce: N6rLwqyz34oUxJEXJ\nIssued At: 2024-03-05T23:18:03.041Z\nExpiration Time: 2024-03-05T23:23:03.041Z',
            signature:
              '0x38faa2fc6f59bef8ffccfc929fb966e1d53ba45e3af7a029ea1d636eaddcbe78a4be0f89eaf7ff7bbaef20a070ad65f9d0f876889686687ef623214fddddb18b',
          },
        },
        signUp: {
          extrinsics: [],
        },
      };

      return request(app.getHttpServer()).post(`/v1/accounts/siwf`).send(siwfRequest).expect(201);
    });
  });

  // afterAll(async () => {
  //   try {
  //     await app.close();
  //   } catch (err) {
  //     console.error(`Failed to close application: ${err}`);
  //   }
  // });
});
