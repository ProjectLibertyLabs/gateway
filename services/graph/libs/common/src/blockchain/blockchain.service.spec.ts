import { BlockchainService } from './blockchain.service';
import { ConfigService } from '../config/config.service';

describe('BlockchainService', () => {
  let blockchainService: BlockchainService;

  beforeAll(async () => {
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
});
