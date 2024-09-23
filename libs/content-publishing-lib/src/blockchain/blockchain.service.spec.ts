/* eslint-disable class-methods-use-this */
import { describe, it } from '@jest/globals';
import { BlockchainService } from './blockchain.service';
import { ApiPromise } from '@polkadot/api';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import blockchainConfig, { IBlockchainConfig } from './blockchain.config';
import { ICapacityLimits } from '#types/interfaces';

class MockBlockchainConfig implements IBlockchainConfig {
  public get frequencyUrl() {
    return new URL(process.env.FREQUENCY_URL);
  }

  public get isDeployedReadOnly() {
    return false;
  }

  public get providerId() {
    return BigInt(process.env.PROVIDER_ID);
  }

  public get providerSeedPhrase() {
    return String(process.env.PROVIDER_ACCOUNT_SEED_PHRASE);
  }

  public get capacityLimit() {
    return { serviceLimit: { type: 'percentage', value: 80n } } as ICapacityLimits;
  }
}

describe('BlockchainService', () => {
  let mockApi: any;
  let blockchainService: BlockchainService;
  let mockBlockchainConfig: MockBlockchainConfig;

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
      providers: [
        {
          provide: blockchainConfig.KEY,
          useClass: MockBlockchainConfig,
        },
        BlockchainService,
      ],
    }).compile();

    blockchainService = moduleRef.get<BlockchainService>(BlockchainService);
    blockchainService.api = mockApi;
    mockBlockchainConfig = moduleRef.get(blockchainConfig.KEY);
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
      jest.spyOn(mockBlockchainConfig, 'providerSeedPhrase', 'get').mockReturnValueOnce(undefined);
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
  });
});
