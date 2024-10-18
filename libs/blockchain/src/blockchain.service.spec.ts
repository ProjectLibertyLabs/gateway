/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, jest, expect } from '@jest/globals';
import { ApiPromise } from '@polkadot/api';
import { Test } from '@nestjs/testing';
import { BlockchainService, NONCE_SERVICE_REDIS_NAMESPACE } from './blockchain.service';
import { IBlockchainConfig } from './blockchain.config';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { CommonPrimitivesMsaProviderRegistryEntry } from '@polkadot/types/lookup';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { getRedisToken } from '@songkeys/nestjs-redis';
import { Provider } from '@nestjs/common';

const mockBlockchainConfigProvider = GenerateMockConfigProvider<IBlockchainConfig>('blockchain', {
  capacityLimit: { serviceLimit: { type: 'percentage', value: 80n } },
  providerId: 1n,
  providerSeedPhrase: '//Alice',
  frequencyTimeoutSecs: 10,
  frequencyUrl: new URL('ws://localhost:9944'),
  isDeployedReadOnly: false,
});

const mockNonceRedisProvider: Provider = {
  provide: getRedisToken(NONCE_SERVICE_REDIS_NAMESPACE),
  useValue: {
    defineCommand: jest.fn(),
  },
};

describe('BlockchainService', () => {
  let mockApi: any;
  let blockchainService: BlockchainService;
  let blockchainConf: IBlockchainConfig;
  const mockGenesisHashHex = jest.fn();

  beforeAll(async () => {
    mockApi = {
      createType: jest.fn(),
      query: {
        capacity: {
          currentEpochInfo: jest.fn(),
        },
      },
      genesisHash: {
        toHex: mockGenesisHashHex,
      },
    } as unknown as ApiPromise;

    const moduleRef = await Test.createTestingModule({
      imports: [],
      controllers: [],
      providers: [BlockchainService, mockBlockchainConfigProvider, mockNonceRedisProvider],
    }).compile();

    blockchainService = moduleRef.get<BlockchainService>(BlockchainService);
    blockchainService.api = mockApi;
    blockchainConf = moduleRef.get<IBlockchainConfig>(mockBlockchainConfigProvider.provide);

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
      jest.spyOn(blockchainConf, 'providerSeedPhrase', 'get').mockReturnValueOnce(undefined);
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

  describe('getNetworkType', () => {
    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should return mainnet for the mainnet hash', () => {
      mockGenesisHashHex.mockReturnValue('0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1');
      expect(blockchainService.getNetworkType()).toEqual('mainnet');
    });

    it('should return testnet for the testnet hash', () => {
      mockGenesisHashHex.mockReturnValue('0x203c6838fc78ea3660a2f298a58d859519c72a5efdc0f194abd6f0d5ce1838e0');
      expect(blockchainService.getNetworkType()).toEqual('testnet-paseo');
    });

    it('should return unknown for anything else', () => {
      mockGenesisHashHex.mockReturnValue('0xabcd');
      expect(blockchainService.getNetworkType()).toEqual('unknown');
    });
  });
});
