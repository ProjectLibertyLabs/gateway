import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { decodeSignedRequest } from '@projectlibertylabs/siwfv2';
import { SiwfV2Service } from './siwfV2.service';
import apiConfig from '#account-api/api.config';
import blockchainConfig from '#account-lib/blockchain/blockchain.config';
import { WalletV2RedirectResponseDto } from '#types/dtos/account/wallet.v2.redirect.response.dto';
import { BlockchainService } from '#account-lib/blockchain/blockchain.service';

const exampleCallback = 'https://www.example.com/callback';
const examplePermissions = [1, 3, 5, 7, 9];
const exampleCredentials = [
  'VerifiedGraphKeyCredential',
  'VerifiedEmailAddressCredential',
  'VerifiedPhoneNumberCredential',
];

describe('SiwfV2Service', () => {
  let siwfV2Service: SiwfV2Service;

  const mockBlockchainService = {
    getNetworkType: jest.fn(),
  };

  const mockBlockchainServiceProvider = {
    provide: BlockchainService,
    useValue: mockBlockchainService,
  };

  beforeAll(() => {
    process.env.SIWF_V2_URL = 'https://www.example.com/siwf';
    process.env.FREQUENCY_URL = 'http://127.0.0.1:9944';
    process.env.FREQUENCY_HTTP_URL = 'http://127.0.0.1:9944';
    process.env.PROVIDER_ACCOUNT_SEED_PHRASE =
      'offer debate skin describe light badge fish turtle actual inject struggle border';
    process.env.PROVIDER_ID = '1';
    process.env.WEBHOOK_BASE_URL = 'http://127.0.0.1';
    process.env.CAPACITY_LIMIT = '{"type":"amount","value":"80"}';
    process.env.GRAPH_ENVIRONMENT_TYPE = 'TestnetPaseo';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [apiConfig, blockchainConfig],
        }),
      ],
      providers: [SiwfV2Service, mockBlockchainServiceProvider],
    }).compile();

    siwfV2Service = module.get<SiwfV2Service>(SiwfV2Service);
  });

  it('should be defined', () => {
    expect(siwfV2Service).toBeDefined();
  });

  describe('getRedirectUrl', () => {
    let result: WalletV2RedirectResponseDto;

    beforeAll(async () => {
      result = await siwfV2Service.getRedirectUrl(exampleCallback, examplePermissions, exampleCredentials);
    });

    it('Should return a valid signedRequest', () => {
      // Assert
      expect(result).toHaveProperty('signedRequest');

      const parsedResult = decodeSignedRequest(result.signedRequest);
      expect(parsedResult.requestedSignatures.payload.callback).toEqual(exampleCallback);
    });

    it('Should return the signedRequest with credentials', () => {
      // Assert
      expect(result).toHaveProperty('signedRequest');

      const parsedResult = decodeSignedRequest(result.signedRequest);
      expect(parsedResult.requestedCredentials).toHaveLength(2);
    });

    it('Should return the signedRequest with permissions', () => {
      // Assert
      expect(result).toHaveProperty('signedRequest');

      const parsedResult = decodeSignedRequest(result.signedRequest);
      expect(parsedResult.requestedSignatures.payload.permissions).toEqual(examplePermissions);
    });

    it('Should go to the correct redirect url', () => {
      const resultUrl = new URL(result.redirectUrl);

      expect(resultUrl.pathname).toEqual('/siwf/start');
      expect(resultUrl.host).toEqual('www.example.com');
    });
  });

  describe('swifV2Endpoint', () => {
    let siwfV2ServiceEndpointTest: SiwfV2Service;
    beforeAll(() => {
      process.env.FREQUENCY_URL = 'http://127.0.0.1:9944';
      process.env.FREQUENCY_HTTP_URL = 'http://127.0.0.1:9944';
      process.env.PROVIDER_ACCOUNT_SEED_PHRASE =
        'offer debate skin describe light badge fish turtle actual inject struggle border';
      process.env.PROVIDER_ID = '1';
      process.env.WEBHOOK_BASE_URL = 'http://127.0.0.1';
      process.env.CAPACITY_LIMIT = '{"type":"amount","value":"80"}';
      process.env.GRAPH_ENVIRONMENT_TYPE = 'TestnetPaseo';
    });

    beforeEach(async () => {
      process.env.SIWF_V2_URL = '';
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [apiConfig, blockchainConfig],
          }),
        ],
        providers: [SiwfV2Service, mockBlockchainServiceProvider],
      }).compile();

      siwfV2ServiceEndpointTest = module.get<SiwfV2Service>(SiwfV2Service);
    });

    it('Should go to the correct redirect url', async () => {
      const result: WalletV2RedirectResponseDto = await siwfV2ServiceEndpointTest.getRedirectUrl(
        exampleCallback,
        examplePermissions,
        exampleCredentials,
      );
      const resultUrl = new URL(result.redirectUrl);

      expect(resultUrl.host).toEqual('www.frequencyaccess.com');
      expect(resultUrl.pathname).toEqual('/siwa/start');
    });
  });
});
