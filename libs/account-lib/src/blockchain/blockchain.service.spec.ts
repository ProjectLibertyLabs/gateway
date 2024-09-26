/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, jest, expect } from '@jest/globals';
import { ApiPromise } from '@polkadot/api';
import { Test } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import blockchainConfig, { IBlockchainConfig } from './blockchain.config';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { CommonPrimitivesMsaProviderRegistryEntry } from '@polkadot/types/lookup';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';

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
      imports: [],
      controllers: [],
      providers: [BlockchainService, mockBlockchainConfigProvider],
    }).compile();

    blockchainService = moduleRef.get<BlockchainService>(BlockchainService);
    blockchainService.api = mockApi;
    blockchainConfig = moduleRef.get<IBlockchainConfig>(mockBlockchainConfigProvider.provide);

    await cryptoWaitReady();
  });

  describe('getCurrentCapacityEpochStart', () => {
    it('should return the current capacity epoch start', async () => {
      // Arrange
      const expectedEpochStart = { toNumber: jest.fn(() => 23) };
      const currentEpochInfo = { epochStart: expectedEpochStart };

      jest.spyOn(mockApi.query.capacity, 'currentEpochInfo').mockResolvedValue(currentEpochInfo);

      // Act
      const result = await blockchainService.getCurrentCapacityEpochStart();

      // Assert
      expect(result).toBe(expectedEpochStart.toNumber());
    });
  });

  describe('validateProviderSeedPhrase', () => {
    beforeAll(() => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValue('1');
      jest
        .spyOn(blockchainService, 'getProviderToRegistryEntry')
        .mockResolvedValue({} as CommonPrimitivesMsaProviderRegistryEntry);
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should not throw if seed phrase is correct for provider', async () => {
      await expect(blockchainService.validateProviderSeedPhrase()).resolves.not.toThrow();
    });

    it('should not throw if no seed phrase configured (read-only mode)', async () => {
      jest.spyOn(blockchainConfig, 'providerSeedPhrase', 'get').mockReturnValueOnce(undefined);
      await expect(blockchainService.validateProviderSeedPhrase()).resolves.not.toThrow();
    });

    it('should throw if seed phrase if for a different provider', async () => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValueOnce('2');
      await expect(blockchainService.validateProviderSeedPhrase()).rejects.toThrow();
    });

    it('should throw if seed phrase does not map to an MSA', async () => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValueOnce(null);
      await expect(blockchainService.validateProviderSeedPhrase()).rejects.toThrow();
    });

    it('should throw if provided ID and seed phrase do not map to a registered provider', async () => {
      jest.spyOn(blockchainService, 'getProviderToRegistryEntry').mockResolvedValueOnce(null);
      await expect(blockchainService.validateProviderSeedPhrase()).rejects.toThrow();
    });
  });
});
