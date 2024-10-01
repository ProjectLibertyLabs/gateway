/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { decodeSignedRequest } from '@projectlibertylabs/siwfv2';
import { ApiModule } from '../src/api.module';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { CacheMonitorService } from '#cache/cache-monitor.service';
import { WalletV2RedirectRequestDto } from '#types/dtos/account/wallet.v2.redirect.request.dto';
import { SCHEMA_NAME_TO_ID } from '#types/constants/schemas';

describe('Accounts v2 Controller', () => {
  let app: INestApplication;
  let module: TestingModule;
  let httpServer: any;

  beforeAll(async () => {
    await cryptoWaitReady();

    process.env.SIWF_V2_URL = 'https://custom.frequencyaccess.com/siwa';

    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();
    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
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

  describe('(GET) /v2/accounts/siwf', () => {
    describe('(GET) /v2/accounts/siwf', () => {
      it('should return a valid redirect URL with all parameters provided', async () => {
        const siwfRequest: WalletV2RedirectRequestDto = {
          callbackUrl: 'https://example.com/callback',
          permissions: [...SCHEMA_NAME_TO_ID.keys()],
          credentials: ['VerifiedPhoneNumberCredential', 'VerifiedGraphKeyCredential'],
        };

        const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(200);

        expect(response.body).toHaveProperty('redirectUrl');
        expect(response.body.redirectUrl).toContain('https://custom.frequencyaccess.com/siwa/start');

        const redirectUrl = new URL(response.body.redirectUrl);
        expect(redirectUrl.searchParams.has('signedRequest'));
        const signedRequest = decodeSignedRequest(redirectUrl.searchParams.get('signedRequest'));
        expect(signedRequest.requestedCredentials).toHaveLength(2);
        expect(signedRequest.requestedSignatures.payload.permissions).toHaveLength(SCHEMA_NAME_TO_ID.size);
      });

      it('should return a valid redirect URL with all array parameters of length 1', async () => {
        const siwfRequest: WalletV2RedirectRequestDto = {
          callbackUrl: 'https://example.com/callback',
          permissions: ['dsnp.broadcast@v1'],
          credentials: ['VerifiedPhoneNumberCredential'],
        };

        const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(200);

        expect(response.body).toHaveProperty('redirectUrl');
        expect(response.body.redirectUrl).toContain('https://custom.frequencyaccess.com/siwa/start');

        const redirectUrl = new URL(response.body.redirectUrl);
        expect(redirectUrl.searchParams.has('signedRequest'));
        const signedRequest = decodeSignedRequest(redirectUrl.searchParams.get('signedRequest'));
        expect(signedRequest.requestedSignatures.payload.callback).toContain('example.com');
        expect(signedRequest.requestedCredentials).toHaveLength(1);
        expect(signedRequest.requestedSignatures.payload.permissions).toHaveLength(1);
      });

      it('should return a valid redirect URL with only required parameters', async () => {
        const siwfRequest: WalletV2RedirectRequestDto = {
          callbackUrl: 'https://example.com/callback',
        };

        const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(200);

        expect(response.body).toHaveProperty('redirectUrl');
        expect(response.body.redirectUrl).toContain('https://custom.frequencyaccess.com/siwa/start');
      });

      it('should fail with 400 if callbackUrl is missing', async () => {
        const siwfRequest = {
          permissions: ['dsnp.broadcast@v2'],
          credentials: ['VerifiedPhoneNumberCredential'],
        };

        await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(400);
      });

      it('should fail with 400 if callbackUrl is invalid', async () => {
        const siwfRequest = {
          callbackUrl: 'not-a-valid-url',
          permissions: ['dsnp.broadcast@v2'],
          credentials: ['VerifiedPhoneNumberCredential'],
        };

        await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(400);
      });

      it('should fail with 400 if permissions contain invalid schema', async () => {
        const siwfRequest = {
          callbackUrl: 'https://example.com/callback',
          permissions: ['invalid.schema@v1'],
          credentials: ['VerifiedPhoneNumberCredential'],
        };

        await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(400);
      });

      it('should fail with 400 if credentials contain invalid type', async () => {
        const siwfRequest = {
          callbackUrl: 'https://example.com/callback',
          permissions: ['dsnp.broadcast@v2'],
          credentials: ['InvalidCredentialType'],
        };

        await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(400);
      });

      it('should handle empty arrays for permissions and credentials', async () => {
        const siwfRequest: WalletV2RedirectRequestDto = {
          callbackUrl: 'https://example.com/callback',
          permissions: [],
          credentials: [],
        };

        const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(200);

        expect(response.body).toHaveProperty('redirectUrl');
        expect(response.body.redirectUrl).toContain('https://custom.frequencyaccess.com/siwa/start');
        const redirectUrl = new URL(response.body.redirectUrl);
        expect(redirectUrl.searchParams.has('signedRequest'));
        const signedRequest = decodeSignedRequest(redirectUrl.searchParams.get('signedRequest'));
        expect(signedRequest.requestedCredentials).toHaveLength(0);
        expect(signedRequest.requestedSignatures.payload.callback).toContain('example.com');
        expect(signedRequest.requestedSignatures.payload.permissions).toHaveLength(0);
      });
    });
  });
});
