import { Test, TestingModule } from '@nestjs/testing';
import { decodeSignedRequest } from '@projectlibertylabs/siwfv2';
import { SiwfV2Service } from './siwfV2.service';
import { IAccountApiConfig } from '#account-api/api.config';
import { IBlockchainConfig } from '#account-lib/blockchain/blockchain.config';
import { WalletV2RedirectResponseDto } from '#types/dtos/account/wallet.v2.redirect.response.dto';
import { BlockchainService } from '#account-lib/blockchain/blockchain.service';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';

const mockBlockchainConfigProvider = GenerateMockConfigProvider<IBlockchainConfig>('blockchain', {
  capacityLimit: { serviceLimit: { type: 'percentage', value: 80n } },
  providerId: 1n,
  providerSeedPhrase: '//Alice',
  frequencyUrl: new URL('ws://localhost:9944'),
  isDeployedReadOnly: false,
});

const mockAccountApiConfigProvider = GenerateMockConfigProvider<IAccountApiConfig>('account-api', {
  apiBodyJsonLimit: '',
  apiPort: 0,
  apiTimeoutMs: 0,
  frequencyHttpUrl: new URL('http://127.0.0.1:9944'),
  graphEnvironmentType: 0,
  siwfUrl: '',
  siwfV2Url: 'https://www.example.com/siwf',
});

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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        SiwfV2Service,
        mockBlockchainServiceProvider,
        mockAccountApiConfigProvider,
        mockBlockchainConfigProvider,
      ],
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
    it('Should go to the correct redirect url', async () => {
      jest
        .spyOn(mockAccountApiConfigProvider.useValue, 'siwfV2Url', 'get')
        .mockReturnValueOnce('https://www.frequencyaccess.com/siwa');
      const result: WalletV2RedirectResponseDto = await siwfV2Service.getRedirectUrl(
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
