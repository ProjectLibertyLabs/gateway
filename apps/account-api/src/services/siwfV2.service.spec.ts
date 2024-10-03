import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { decodeSignedRequest } from '@projectlibertylabs/siwfv2';
import base64url from 'base64url';
import { SiwfV2Service } from './siwfV2.service';
import { IAccountApiConfig } from '#account-api/api.config';
import { IBlockchainConfig } from '#blockchain/blockchain.config';
import { WalletV2RedirectResponseDto } from '#types/dtos/account/wallet.v2.redirect.response.dto';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { validSiwfResponsePayload } from './siwfV2.mock.spec';

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
    publicKeyToMsaId: jest.fn(),
  };

  const mockBlockchainServiceProvider = {
    provide: BlockchainRpcQueryService,
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

    it('Should build the result', async () => {
      expect.assertions(1);
      result = await siwfV2Service.getRedirectUrl(exampleCallback, examplePermissions, exampleCredentials);
      expect(result).toBeDefined();
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

  describe('getPayload', () => {
    it('Should call the siwfV2Url if there is an authorizationCode', async () => {
      // This test requires an actual authorization code and endpoint
      // You may need to set up a test environment or mock server for this
      const validAuthCode = 'valid-auth-code'; // Replace with a real test auth code
      jest.spyOn(siwfV2Service as any, 'swifV2Endpoint').mockReturnValue('https://siwf.example.com');

      // Mock the global fetch function
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validSiwfResponsePayload,
      } as Response);

      const result = await siwfV2Service.getPayload({ authorizationCode: validAuthCode });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('payloads');
    });

    it('Should return the parsed and validated if there is an authorizationPayload', async () => {
      // A valid SIWF response payload

      const result = await siwfV2Service.getPayload({
        authorizationPayload: base64url(JSON.stringify(validSiwfResponsePayload)),
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('payloads');
    });

    it('Should throw BadRequest if there is no authorizationPayload or authorizationCode', async () => {
      await expect(siwfV2Service.getPayload({} as any)).rejects.toThrow(BadRequestException);
    });

    it('Should throw BadRequestException if the authorizationPayload is bad', async () => {
      // {foo:"bar"}
      const invalidPayload = 'e2ZvbzoiYmFyIn0';

      await expect(siwfV2Service.getPayload({ authorizationPayload: invalidPayload } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Should throw BadRequestException if the authorizationCode is invalid', async () => {
      const invalidAuthCode = 'invalid-auth-code';

      jest.spyOn(siwfV2Service as any, 'swifV2Endpoint').mockReturnValue('https://siwf.example.com');

      // Mock the global fetch function
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid authorization code' }),
      } as Response);

      await expect(siwfV2Service.getPayload({ authorizationCode: invalidAuthCode })).rejects.toThrow(
        BadRequestException,
      );

      // Verify that fetch was called with the correct URL and options
      expect(global.fetch).toHaveBeenCalledWith(
        new URL('https://siwf.example.com/api/payload?authorizationCode=invalid-auth-code'),
      );
    });
  });

  describe('getSiwfV2LoginResponse', () => {
    it('Should parse the control key', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfResponsePayload);

      expect(result).toBeDefined();
      expect(result.controlKey).toEqual('f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ');
    });

    it('Should parse the email', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfResponsePayload);

      expect(result).toBeDefined();
      expect(result.email).toEqual('john.doe@example.com');
    });

    it('Should parse the phone number', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfResponsePayload);

      expect(result).toBeDefined();
      expect(result.phoneNumber).toEqual('+01-234-867-5309');
    });

    it('Should parse the graph key', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfResponsePayload);

      expect(result).toBeDefined();
      expect(result.graphKey).toBeDefined();
      expect(result.graphKey.encodedPrivateKeyValue).toEqual(
        '0xd0910c853563723253c4ed105c08614fc8aaaf1b0871375520d72251496e8d87',
      );
      expect(result.graphKey.encodedPublicKeyValue).toEqual(
        '0xb5032900293f1c9e5822fd9c120b253cb4a4dfe94c214e688e01f32db9eedf17',
      );
    });

    it('Should parse MSA Id', async () => {
      mockBlockchainService.publicKeyToMsaId.mockReturnValueOnce('123456');

      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfResponsePayload);

      expect(result).toBeDefined();
      expect(result.msaId).toEqual('123456');
      expect(mockBlockchainService.publicKeyToMsaId).toHaveBeenCalledWith(
        'f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ',
      );
    });

    it('Should NOT return an MSA Id if there is none', async () => {
      mockBlockchainService.publicKeyToMsaId.mockReturnValueOnce(null);
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfResponsePayload);

      expect(result).toBeDefined();
      expect(result.msaId).toBeUndefined();
      expect(mockBlockchainService.publicKeyToMsaId).toHaveBeenCalledWith(
        'f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ',
      );
    });

    it('Should copy the credentials', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfResponsePayload);

      expect(result).toBeDefined();
      expect(result.rawCredentials).toHaveLength(3);
    });
  });
});
