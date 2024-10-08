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
import {
  validSiwfAddDelegationResponsePayload,
  validSiwfLoginResponsePayload,
  validSiwfNewUserResponse,
} from './siwfV2.mock.spec';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';

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
    getApi: jest.fn(),
  };

  const mockBlockchainServiceProvider = {
    provide: BlockchainRpcQueryService,
    useValue: mockBlockchainService,
  };

  const mockEnqueueService = {
    enqueueRequest: jest.fn(),
  };

  const mockEnqueueServiceProvider = {
    provide: EnqueueService,
    useValue: mockEnqueueService,
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        SiwfV2Service,
        mockBlockchainServiceProvider,
        mockAccountApiConfigProvider,
        mockBlockchainConfigProvider,
        mockEnqueueServiceProvider,
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
        json: async () => validSiwfAddDelegationResponsePayload,
      } as Response);

      const result = await siwfV2Service.getPayload({ authorizationCode: validAuthCode });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('payloads');
    });

    it('Should return the parsed and validated if there is an authorizationPayload', async () => {
      // A valid SIWF response payload

      const result = await siwfV2Service.getPayload({
        authorizationPayload: base64url(JSON.stringify(validSiwfAddDelegationResponsePayload)),
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

    it('Should throw BadRequest if the payload is for a different provider id', async () => {
      jest.spyOn(mockBlockchainConfigProvider.useValue, 'providerId', 'get').mockReturnValue(BigInt(2222));
      await expect(
        siwfV2Service.getPayload({
          authorizationPayload: base64url(JSON.stringify(validSiwfAddDelegationResponsePayload)),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSiwfV2LoginResponse', () => {
    it('Should parse the control key', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfAddDelegationResponsePayload);

      expect(result).toBeDefined();
      expect(result.controlKey).toEqual('f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ');
    });

    it('Should parse the email', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfAddDelegationResponsePayload);

      expect(result).toBeDefined();
      expect(result.email).toEqual('john.doe@example.com');
    });

    it('Should parse the phone number', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfAddDelegationResponsePayload);

      expect(result).toBeDefined();
      expect(result.phoneNumber).toEqual('+01-234-867-5309');
    });

    it('Should parse the graph key', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfAddDelegationResponsePayload);

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

      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfAddDelegationResponsePayload);

      expect(result).toBeDefined();
      expect(result.msaId).toEqual('123456');
      expect(mockBlockchainService.publicKeyToMsaId).toHaveBeenCalledWith(
        'f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ',
      );
    });

    it('Should NOT return an MSA Id if there is none', async () => {
      mockBlockchainService.publicKeyToMsaId.mockReturnValueOnce(null);
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfAddDelegationResponsePayload);

      expect(result).toBeDefined();
      expect(result.msaId).toBeUndefined();
      expect(mockBlockchainService.publicKeyToMsaId).toHaveBeenCalledWith(
        'f6akufkq9Lex6rT8RCEDRuoZQRgo5pWiRzeo81nmKNGWGNJdJ',
      );
    });

    it('Should copy the credentials', async () => {
      const result = await siwfV2Service.getSiwfV2LoginResponse(validSiwfAddDelegationResponsePayload);

      expect(result).toBeDefined();
      expect(result.rawCredentials).toHaveLength(3);
    });
  });

  describe('queueChainActions', () => {
    // Helpful note to future devs:
    // When creating the expectations for these, it can be a pain.
    // So instead, just connect up to a real chain that has all the metadata!
    //
    // import { ApiPromise, WsProvider } from '@polkadot/api';
    // ...
    // const api = await ApiPromise.create({ provider: new WsProvider('ws://localhost:9944') }).then((x) => x.isReady);
    // mockBlockchainService.getApi.mockReturnValue(api);
    //
    // Then you can just check the values and output extrinsics in the Polkdaot Developer Tool UI: https://polkadot.js.org/apps/
    // Under Developer -> Extrinsics -> Decode
    // Good Luck!

    const mockApiTxHashes = (mocks: { pallet: string; extrinsic: string; hash: string }[]) =>
      mocks.reduce(
        (prev, { pallet, extrinsic, hash }) => {
          const add = {
            [extrinsic]: jest.fn().mockReturnValue({
              toHex: jest.fn().mockReturnValue(hash),
            }),
          };
          // eslint-disable-next-line no-param-reassign
          prev.tx[pallet] = prev.tx[pallet] ? { ...prev.tx[pallet], ...add } : add;
          return prev;
        },
        { tx: {} },
      );

    it('should do nothing if there are no chain submissions', async () => {
      const result = await siwfV2Service.queueChainActions(validSiwfLoginResponsePayload);

      expect(result).toBeNull();
      expect(mockEnqueueService.enqueueRequest).not.toHaveBeenCalled();
    });

    it('should return correctly for the add delegation setup', async () => {
      const correctGrantDelegationHash =
        '0xed01043c038eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4801bac399831b9e3ad464a16e62ad1252cc8344a2c52f80252b2aa450a06ae2362f6f4afcaca791a81f28eaa99080e2654bdbf1071a276213242fc153cca43cfa8e01000000000000001405000700080009000a0018000000';
      mockBlockchainService.getApi.mockReturnValue(
        mockApiTxHashes([{ pallet: 'msa', extrinsic: 'grantDelegation', hash: correctGrantDelegationHash }]),
      );

      await expect(siwfV2Service.queueChainActions(validSiwfAddDelegationResponsePayload)).resolves.not.toThrow();
      expect(mockEnqueueService.enqueueRequest).toHaveBeenCalledWith({
        calls: [
          {
            encodedExtrinsic: correctGrantDelegationHash,
            extrinsicName: 'grantDelegation',
            pallet: 'msa',
          },
        ],
        type: 'SIWF_SIGNUP',
      });
    });

    it('should return correctly for the new user setup', async () => {
      const correctGrantDelegationHash =
        '0xed01043c018eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48011a27cb6d79b508e1ffc8d6ae70af78d5b3561cdc426124a06f230d7ce70e757e1947dd1bac8f9e817c30676a5fa6b06510bae1201b698b044ff0660c60f18c8a01000000000000001405000700080009000a0018000000';
      const correctStatefulStorageHash =
        '0xf501043f068eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48019eb338773b386ded2e3731ba68ba734c80408b3ad24f92ed3c60342d374a32293851fa8e41d722c72a5a4e765a9e401c68570a8c666ab678e4e5d94aa6825d851c0014000000040040eea1e39d2f154584c4b1ca8f228bb49a';
      const correctClaimHandleHash =
        '0xd9010442008eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4801b004140fd8ba3395cf5fcef49df8765d90023c293fde4eaf2e932cc24f74fc51b006c0bebcf31d85565648b4881fa22115e0051a3bdb95ab5bf7f37ac66f798f344578616d706c6548616e646c6518000000';
      mockBlockchainService.getApi.mockReturnValue(
        mockApiTxHashes([
          { pallet: 'msa', extrinsic: 'createSponsoredAccountWithDelegation', hash: correctGrantDelegationHash },
          { pallet: 'statefulStorage', extrinsic: 'applyItemActionsWithSignatureV2', hash: correctStatefulStorageHash },
          { pallet: 'handles', extrinsic: 'claimHandle', hash: correctClaimHandleHash },
        ]),
      );

      await expect(siwfV2Service.queueChainActions(validSiwfNewUserResponse)).resolves.not.toThrow();
      expect(mockEnqueueService.enqueueRequest).toHaveBeenCalledWith({
        calls: [
          {
            encodedExtrinsic: correctGrantDelegationHash,
            extrinsicName: 'createSponsoredAccountWithDelegation',
            pallet: 'msa',
          },
          {
            encodedExtrinsic: correctStatefulStorageHash,
            extrinsicName: 'applyItemActionsWithSignatureV2',
            pallet: 'statefulStorage',
          },
          {
            encodedExtrinsic: correctClaimHandleHash,
            extrinsicName: 'claimHandle',
            pallet: 'handles',
          },
        ],
        type: 'SIWF_SIGNUP',
      });
    });
  });
});
