import { describe, it } from '@jest/globals';
import { BlockchainService } from './blockchain.service';
import { ConfigService } from '#libs/config';
import { ApiPromise } from '@polkadot/api';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

describe('BlockchainService', () => {
  let mockApi: any;
  let blockchainService: BlockchainService;
  let configService: ConfigService;

  beforeAll(async () => {
    mockApi = {
      createType: jest.fn(),
      query: {
        capacity: {
          currentEpochInfo: jest.fn(),
        },
      },
    } as unknown as ApiPromise;

    process.env = {
      REDIS_URL: undefined,
      FREQUENCY_URL: undefined,
      FREQUENCY_HTTP_URL: undefined,
      API_PORT: undefined,
      BLOCKCHAIN_SCAN_INTERVAL_SECONDS: undefined,
      TRUST_UNFINALIZED_BLOCKS: undefined,
      PROVIDER_ACCOUNT_SEED_PHRASE: '//Alice',
      PROVIDER_ID: '1',
      SIWF_URL: undefined,
      SIWF_DOMAIN: undefined,
      WEBHOOK_BASE_URL: undefined,
      PROVIDER_ACCESS_TOKEN: undefined,
      WEBHOOK_FAILURE_THRESHOLD: undefined,
      HEALTH_CHECK_SUCCESS_THRESHOLD: undefined,
      WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
      HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: undefined,
      HEALTH_CHECK_MAX_RETRIES: undefined,
      CAPACITY_LIMIT: undefined,
      CACHE_KEY_PREFIX: undefined,
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [() => process.env],
        }),
      ],
      controllers: [],
      providers: [ConfigService, BlockchainService],
    }).compile();

    await ConfigModule.envVariablesLoaded;

    configService = moduleRef.get<ConfigService>(ConfigService);
    blockchainService = moduleRef.get<BlockchainService>(BlockchainService);
    blockchainService.api = mockApi;
  });

  describe('validateProviderSeedPhrase', () => {
    beforeAll(() => {
      jest.spyOn(configService, 'providerPublicKeyAddress', 'get').mockReturnValue('<public address>');
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValue('1');
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should not throw if seed phrase is correct for provider', async () => {
      await expect(blockchainService.validateProviderSeedPhrase()).resolves.not.toThrow();
    });

    it('should not throw if no seed phrase configured (read-only mode)', async () => {
      jest.spyOn(configService, 'providerPublicKeyAddress', 'get').mockReturnValueOnce('');
      await expect(blockchainService.validateProviderSeedPhrase()).resolves.not.toThrow();
    });

    it('should throw if seed phrase is incorrect for provider', async () => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValueOnce(null);
      await expect(blockchainService.validateProviderSeedPhrase()).rejects.toThrow();
    });
  });
});
