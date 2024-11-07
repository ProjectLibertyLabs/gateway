/* eslint-disable import/no-extraneous-dependencies */
 
import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { decodeSignedRequest } from '@projectlibertylabs/siwfv2';
import type { Server } from 'node:http';
import base64url from 'base64url';
import request from 'supertest';
import { ApiModule } from '../src/api.module';
import { createMockSiwfServer } from '#account-api/services/siwfV2.mock.spec';
import { CacheMonitorService } from '#cache/cache-monitor.service';
import { WalletV2RedirectRequestDto } from '#types/dtos/account/wallet.v2.redirect.request.dto';
import { SCHEMA_NAME_TO_ID } from '#types/constants/schemas';
import { validSiwfV2Create } from './e2e-setup.mock.spec';
import { NestExpressApplication } from '@nestjs/platform-express';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';

describe('Accounts v2 Controller', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let httpServer: any;
  let mockSiwfServer: Server;
  const mockSiwfPort = 54261;

  beforeAll(async () => {
    await cryptoWaitReady();

    mockSiwfServer = createMockSiwfServer(mockSiwfPort);
    process.env.SIWF_V2_URL = `http://localhost:${mockSiwfPort}`;

    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();

    // Uncomment below to see logs when debugging tests
    // module.useLogger(new Logger());

    const config = app.get<IAccountApiConfig>(apiConfig.KEY);
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, enableDebugMessages: true }));
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();

    // Make sure we're connected to the chain before running tests
    const blockchainService = app.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    await blockchainService.isReady();

    httpServer = app.getHttpServer();

    // Redis timeout keeping test suite alive for too long; disable
    const cacheMonitor = app.get<CacheMonitorService>(CacheMonitorService);
    cacheMonitor.startConnectionTimer = jest.fn();
  });

  afterAll(async () => {
    await app.close();
    await httpServer.close();
    await new Promise((r) => {
      mockSiwfServer.close(r);
    });

    // Wait for some pending async stuff to finish
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  });

  describe('(GET) /v2/accounts/siwf', () => {
    it('should return a valid redirect URL with all parameters provided', async () => {
      const siwfRequest: WalletV2RedirectRequestDto = {
        callbackUrl: 'https://example.com/callback',
        permissions: [...SCHEMA_NAME_TO_ID.keys()],
        credentials: ['VerifiedPhoneNumberCredential', 'VerifiedGraphKeyCredential'],
      };

      const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('redirectUrl');
      expect(response.body.redirectUrl).toContain(`http://localhost:${mockSiwfPort}/start`);

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

      const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('redirectUrl');
      expect(response.body.redirectUrl).toContain(`http://localhost:${mockSiwfPort}/start`);

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

      const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('redirectUrl');
      expect(response.body.redirectUrl).toContain(`http://localhost:${mockSiwfPort}/start`);
    });

    it('should fail with 400 if callbackUrl is missing', async () => {
      const siwfRequest = {
        permissions: ['dsnp.broadcast@v2'],
        credentials: ['VerifiedPhoneNumberCredential'],
      };

      await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail with 400 if callbackUrl is invalid', async () => {
      const siwfRequest = {
        callbackUrl: 'not-a-valid-url',
        permissions: ['dsnp.broadcast@v2'],
        credentials: ['VerifiedPhoneNumberCredential'],
      };

      await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail with 400 if permissions contain invalid schema', async () => {
      const siwfRequest = {
        callbackUrl: 'https://example.com/callback',
        permissions: ['invalid.schema@v1'],
        credentials: ['VerifiedPhoneNumberCredential'],
      };

      await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail with 400 if credentials contain invalid type', async () => {
      const siwfRequest = {
        callbackUrl: 'https://example.com/callback',
        permissions: ['dsnp.broadcast@v2'],
        credentials: ['InvalidCredentialType'],
      };

      await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle empty arrays for permissions and credentials', async () => {
      const siwfRequest: WalletV2RedirectRequestDto = {
        callbackUrl: 'https://example.com/callback',
        permissions: [],
        credentials: [],
      };

      const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('redirectUrl');
      expect(response.body.redirectUrl).toContain(`http://localhost:${mockSiwfPort}/start`);
      const redirectUrl = new URL(response.body.redirectUrl);
      expect(redirectUrl.searchParams.has('signedRequest'));
      const signedRequest = decodeSignedRequest(redirectUrl.searchParams.get('signedRequest'));
      expect(signedRequest.requestedCredentials).toHaveLength(0);
      expect(signedRequest.requestedSignatures.payload.callback).toContain('example.com');
      expect(signedRequest.requestedSignatures.payload.permissions).toHaveLength(0);
    });
  });

  describe('(POST) /v2/accounts/siwf', () => {
    it('should process a valid SIWF v2 callback with authorizationPayload', async () => {
      const mockPayload = {
        authorizationPayload: base64url(JSON.stringify(validSiwfV2Create)),
      };

      const response = await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('controlKey');
      expect(response.body).toHaveProperty('rawCredentials');
    });

    it('should process a valid SIWF v2 callback with authorizationCode = validSiwfAddDelegationResponsePayload', async () => {
      const mockPayload = {
        authorizationCode: 'validSiwfAddDelegationResponsePayload',
      };

      const response = await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.OK);

      // Just check for some basics.
      expect(response.body).toHaveProperty('controlKey');
      expect(response.body).toHaveProperty('rawCredentials');
    });

    it('should process a valid SIWF v2 callback with authorizationCode = validSiwfLoginResponsePayload', async () => {
      const mockPayload = {
        authorizationCode: 'validSiwfLoginResponsePayload',
      };

      const response = await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.OK);

      // Just check for some basics.
      expect(response.body).toHaveProperty('controlKey');
      expect(response.body).toHaveProperty('rawCredentials');
    });

    it('should process a valid SIWF v2 callback with authorizationCode = validSiwfNewUserResponse', async () => {
      const mockPayload = {
        authorizationCode: 'validSiwfNewUserResponse',
      };

      // Just check for some basics.
      const response = await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('controlKey');
      expect(response.body).toHaveProperty('rawCredentials');
    });

    it('should return 400 if both authorizationPayload and authorizationCode are missing', async () => {
      const mockPayload = {};

      await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 if authorizationPayload is invalid', async () => {
      const mockPayload = {
        authorizationPayload: 'invalidPayload',
      };

      await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 if authorizationCode is invalid', async () => {
      const mockPayload = {
        authorizationCode: 'invalidCode',
      };

      await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.BAD_REQUEST);
    });
  });
});
