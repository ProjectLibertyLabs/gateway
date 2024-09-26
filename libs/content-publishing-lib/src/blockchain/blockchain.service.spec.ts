/* eslint-disable class-methods-use-this */
import { describe, it } from '@jest/globals';
import { BlockchainService } from './blockchain.service';
import { ApiPromise } from '@polkadot/api';
import { Test } from '@nestjs/testing';
import { IBlockchainConfig } from './blockchain.config';
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
  let blockchainConf: IBlockchainConfig;

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
    blockchainConf = moduleRef.get<IBlockchainConfig>(mockBlockchainConfigProvider.provide);
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
  });
});
