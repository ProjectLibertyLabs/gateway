import { BlockchainService } from './blockchain.service';
import { ApiPromise } from '@polkadot/api';
import { Test } from '@nestjs/testing';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { IBlockchainConfig } from './blockchain.config';

const mockBlockchainConfigProvider = GenerateMockConfigProvider<IBlockchainConfig>('blockchain', {
  capacityLimit: { serviceLimit: { type: 'percentage', value: 80n } },
  providerId: 1n,
  providerSeedPhrase: '//Alice',
  frequencyUrl: new URL('ws://localhost:9944'),
  isDeployedReadOnly: false,
});

describe('BlockchainService', () => {
  let mockApi: any;
  let blockchainService: BlockchainService;
  let blockchainConfig: IBlockchainConfig;

  beforeAll(async () => {
    mockApi = {
      createType: jest.fn(),
      query: {
        capacity: {
          currentEpochInfo: jest.fn(),
        },
      },
    } as unknown as ApiPromise;

    const moduleRef = await Test.createTestingModule({
      controllers: [],
      providers: [BlockchainService, mockBlockchainConfigProvider],
    }).compile();

    blockchainService = moduleRef.get<BlockchainService>(BlockchainService);
    blockchainService.api = mockApi;
    blockchainConfig = moduleRef.get<IBlockchainConfig>(mockBlockchainConfigProvider.provide);
  });

  describe('getCurrentCapacityEpochStart', () => {
    it('should return the current capacity epoch start', async () => {
      // Arrange
      const expectedEpochStart = { toNumber: () => 32 };
      const currentEpochInfo = {
        epochStart: expectedEpochStart,
      };

      jest.spyOn(blockchainService, 'query').mockResolvedValue(currentEpochInfo);

      // Act
      const result = await blockchainService.getCurrentCapacityEpochStart();

      // Assert
      expect(result).toBe(expectedEpochStart.toNumber());
    });
  });

  describe('validateProviderSeedPhrase', () => {
    beforeAll(() => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValue('1');
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should not throw if seed phrase is correct for provider', async () => {
      await expect(blockchainService.validateProviderSeedPhrase()).resolves.not.toThrow();
    });

    it('should not throw if no seed phrase configured (read-only mode)', async () => {
      jest.spyOn(blockchainConfig, 'providerSeedPhrase', 'get').mockReturnValueOnce(undefined);
      jest.spyOn(blockchainConfig, 'isDeployedReadOnly', 'get').mockReturnValueOnce(true);
      await expect(blockchainService.validateProviderSeedPhrase()).resolves.not.toThrow();
    });

    it('should throw if seed phrase is incorrect for provider', async () => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValueOnce(null);
      await expect(blockchainService.validateProviderSeedPhrase()).rejects.toThrow();
    });
  });
});
