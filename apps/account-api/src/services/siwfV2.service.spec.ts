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
    const validSiwfResponsePayload = {
      userPublicKey: {
        encodedValue: 'f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ',
        encoding: 'base58',
        format: 'ss58',
        type: 'Sr25519',
      },
      payloads: [
        {
          signature: {
            algo: 'Sr25519',
            encoding: 'base16',
            encodedValue:
              '0xbac399831b9e3ad464a16e62ad1252cc8344a2c52f80252b2aa450a06ae2362f6f4afcaca791a81f28eaa99080e2654bdbf1071a276213242fc153cca43cfa8e',
          },
          endpoint: {
            pallet: 'msa',
            extrinsic: 'grantDelegation',
          },
          type: 'addProvider',
          payload: {
            authorizedMsaId: 1,
            schemaIds: [5, 7, 8, 9, 10],
            expiration: 24,
          },
        },
      ],
      credentials: [
        {
          '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/undefined-terms/v2'],
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
            proofValue: 'z4jArnPwuwYxLnbBirLanpkcyBpmQwmyn5f3PdTYnxhpy48qpgvHHav6warjizjvtLMg6j3FK3BqbR2nuyT2UTSWC',
          },
        },
        {
          '@context': ['https://www.w3.org/ns/credentials/v2', 'https://www.w3.org/ns/credentials/undefined-terms/v2'],
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
            proofValue: 'z2HHWwtWggZfvGqNUk4S5AAbDGqZRFXjpMYAsXXmEksGxTk4DnnkN3upCiL1mhgwHNLkxY3s8YqNyYnmpuvUke7jF',
          },
        },
      ],
    };

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
});
