/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import base64url from 'base64url';
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
    it('should return a valid redirect URL with all parameters provided', async () => {
      const siwfRequest: WalletV2RedirectRequestDto = {
        callbackUrl: 'https://example.com/callback',
        permissions: [...SCHEMA_NAME_TO_ID.keys()],
        credentials: ['VerifiedPhoneNumberCredential', 'VerifiedGraphKeyCredential'],
      };

      const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.OK);

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

      const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.OK);

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

      const response = await request(httpServer).get('/v2/accounts/siwf').query(siwfRequest).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('redirectUrl');
      expect(response.body.redirectUrl).toContain('https://custom.frequencyaccess.com/siwa/start');
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
      expect(response.body.redirectUrl).toContain('https://custom.frequencyaccess.com/siwa/start');
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
        authorizationPayload: base64url(
          JSON.stringify({
            userPublicKey: {
              encodedValue: 'f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ',
              encoding: 'base58',
              format: 'ss58',
              type: 'Sr25519',
            },
            payloads: [
              {
                signature: {
                  algo: 'SR25519',
                  encoding: 'base16',
                  encodedValue:
                    '0x1a27cb6d79b508e1ffc8d6ae70af78d5b3561cdc426124a06f230d7ce70e757e1947dd1bac8f9e817c30676a5fa6b06510bae1201b698b044ff0660c60f18c8a',
                },
                endpoint: {
                  pallet: 'msa',
                  extrinsic: 'createSponsoredAccountWithDelegation',
                },
                type: 'addProvider',
                payload: {
                  authorizedMsaId: 1,
                  schemaIds: [5, 7, 8, 9, 10],
                  expiration: 24,
                },
              },
              {
                signature: {
                  algo: 'SR25519',
                  encoding: 'base16',
                  encodedValue:
                    '0x9eb338773b386ded2e3731ba68ba734c80408b3ad24f92ed3c60342d374a32293851fa8e41d722c72a5a4e765a9e401c68570a8c666ab678e4e5d94aa6825d85',
                },
                endpoint: {
                  pallet: 'statefulStorage',
                  extrinsic: 'applyItemActionsWithSignatureV2',
                },
                type: 'itemActions',
                payload: {
                  schemaId: 7,
                  targetHash: 0,
                  expiration: 20,
                  actions: [
                    {
                      type: 'addItem',
                      payloadHex: '0x40eea1e39d2f154584c4b1ca8f228bb49ae5a14786ed63c90025e755f16bd58d37',
                    },
                  ],
                },
              },
              {
                signature: {
                  algo: 'SR25519',
                  encoding: 'base16',
                  encodedValue:
                    '0xb004140fd8ba3395cf5fcef49df8765d90023c293fde4eaf2e932cc24f74fc51b006c0bebcf31d85565648b4881fa22115e0051a3bdb95ab5bf7f37ac66f798f',
                },
                endpoint: {
                  pallet: 'handles',
                  extrinsic: 'claimHandle',
                },
                type: 'claimHandle',
                payload: {
                  baseHandle: 'ExampleHandle',
                  expiration: 24,
                },
              },
            ],
            credentials: [
              {
                '@context': [
                  'https://www.w3.org/ns/credentials/v2',
                  'https://www.w3.org/ns/credentials/undefined-terms/v2',
                ],
                type: ['VerifiedEmailAddressCredential', 'VerifiableCredential'],
                issuer: 'did:web:frequencyaccess.com',
                validFrom: '2024-08-21T21:28:08.289+0000',
                credentialSchema: {
                  type: 'JsonSchema',
                  id: 'https://schemas.frequencyaccess.com/VerifiedEmailAddressCredential/bciqe4qoczhftici4dzfvfbel7fo4h4sr5grco3oovwyk6y4ynf44tsi.json',
                },
                credentialSubject: {
                  id: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
                  emailAddress: 'john.doe@example.com',
                  lastVerified: '2024-08-21T21:27:59.309+0000',
                },
                proof: {
                  type: 'DataIntegrityProof',
                  verificationMethod: 'did:web:frequencyaccess.com#z6MkofWExWkUvTZeXb9TmLta5mBT6Qtj58es5Fqg1L5BCWQD',
                  cryptosuite: 'eddsa-rdfc-2022',
                  proofPurpose: 'assertionMethod',
                  proofValue:
                    'z4jArnPwuwYxLnbBirLanpkcyBpmQwmyn5f3PdTYnxhpy48qpgvHHav6warjizjvtLMg6j3FK3BqbR2nuyT2UTSWC',
                },
              },
              {
                '@context': [
                  'https://www.w3.org/ns/credentials/v2',
                  'https://www.w3.org/ns/credentials/undefined-terms/v2',
                ],
                type: ['VerifiedGraphKeyCredential', 'VerifiableCredential'],
                issuer: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
                validFrom: '2024-08-21T21:28:08.289+0000',
                credentialSchema: {
                  type: 'JsonSchema',
                  id: 'https://schemas.frequencyaccess.com/VerifiedGraphKeyCredential/bciqmdvmxd54zve5kifycgsdtoahs5ecf4hal2ts3eexkgocyc5oca2y.json',
                },
                credentialSubject: {
                  id: 'did:key:z6QNucQV4AF1XMQV4kngbmnBHwYa6mVswPEGrkFrUayhttT1',
                  encodedPublicKeyValue: '0xb5032900293f1c9e5822fd9c120b253cb4a4dfe94c214e688e01f32db9eedf17',
                  encodedPrivateKeyValue: '0xd0910c853563723253c4ed105c08614fc8aaaf1b0871375520d72251496e8d87',
                  encoding: 'base16',
                  format: 'bare',
                  type: 'X25519',
                  keyType: 'dsnp.public-key-key-agreement',
                },
                proof: {
                  type: 'DataIntegrityProof',
                  verificationMethod: 'did:key:z6MktZ15TNtrJCW2gDLFjtjmxEdhCadNCaDizWABYfneMqhA',
                  cryptosuite: 'eddsa-rdfc-2022',
                  proofPurpose: 'assertionMethod',
                  proofValue:
                    'z2HHWwtWggZfvGqNUk4S5AAbDGqZRFXjpMYAsXXmEksGxTk4DnnkN3upCiL1mhgwHNLkxY3s8YqNyYnmpuvUke7jF',
                },
              },
            ],
          }),
        ),
      };

      const response = await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('controlKey');
      expect(response.body).toHaveProperty('rawCredentials');
    });

    // TODO: Is there a way to mock the fetch in the e2e?
    // Perhaps I need to spin up a mock server?
    // it('should process a valid SIWF v2 callback with authorizationCode', async () => {
    //   const mockPayload = {
    //     authorizationCode: 'validAuthorizationCode',
    //   };

    //   const response = await request(httpServer).post('/v2/accounts/siwf').send(mockPayload).expect(HttpStatus.OK);

    //   expect(response.body).toHaveProperty('controlKey');
    //   expect(response.body).toHaveProperty('rawCredentials');
    // });

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
