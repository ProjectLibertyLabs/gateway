import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { u32 } from '@polkadot/types';
import { BlockchainService } from './blockchain.service';
import { ConfigService } from '../config/config.service';

describe('BlockchainService', () => {
  let mockApi: any;
  let blockchainService: BlockchainService;

  beforeEach(async () => {
    mockApi = {
      createType: jest.fn(),
      query: jest.fn(),
    };
    const configService = {
      logger: jest.fn(),
      nestConfigService: jest.fn(),
      providerBaseUrl: jest.fn(),
      providerApiToken: jest.fn(),
      getProviderId: jest.fn(),
      getQueueHighWater: jest.fn(),
      getApiPort: jest.fn(),
      getReconnectionServiceRequired: jest.fn(),
      getBlockchainScanIntervalMinutes: jest.fn(),
      getRedisUrl: jest.fn(),
      getFrequencyUrl: jest.fn(),
      getGraphEnvironmentType: jest.fn(),
      getProviderAccountSeedPhrase: jest.fn(),
      redisUrl: jest.fn(),
      frequencyUrl: jest.fn(),
      getHealthCheckMaxRetries: jest.fn(),
      getHealthCheckMaxRetryIntervalSeconds: jest.fn(),
      getHealthCheckSuccessThreshold: jest.fn(),
      getWebhookFailureThreshold: jest.fn(),
      getWebhookRetryIntervalSeconds: jest.fn(),
      webhookRetryIntervalSeconds: jest.fn(),
      getPageSize: jest.fn(),
      getDebounceSeconds: jest.fn(),
    };
    blockchainService = new BlockchainService(configService as unknown as ConfigService);
  });

  describe('createExtrinsicCall', () => {
    it('should return an extrinsic call', async () => {
      const pallet = 'messages';
      const extrinsic = 'addIpfsMessage';
      const schemaId = 1;
      const cid = 'QmRgJZmR6Z6yB5k9aLXjzJ6jG8L6tq4v4J9zQfDz7p3J9v';
      const payloadLength = 100;
    });
  });

  describe('getCurrentCapacityEpochStart', () => {
    it('should return the current capacity epoch start', async () => {
      // Arrange
      const expectedEpochStart: u32 = mockApi.createType('u32', 123);
      const currentEpochInfo = { epochStart: expectedEpochStart };

      jest.spyOn(blockchainService, 'query').mockResolvedValue(currentEpochInfo);

      // Act
      const result = await blockchainService.getCurrentCapacityEpochStart();

      // Assert
      expect(result).toBe(expectedEpochStart);
    });
  });
});
