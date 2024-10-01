import workerConfig, { IGraphWorkerConfig } from './worker.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService } = configSetup<IGraphWorkerConfig>(workerConfig);

describe('Graph Worker Config', () => {
  const ALL_ENV: { [key: string]: string | undefined } = {
    GRAPH_ENVIRONMENT_TYPE: undefined,
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('valid environment', () => {
    let graphWorkerConfig: IGraphWorkerConfig;
    beforeAll(async () => {
      graphWorkerConfig = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(graphWorkerConfig).toBeDefined();
    });

    it('should get webhook failure threshold', () => {
      expect(graphWorkerConfig.webhookFailureThreshold).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_FAILURE_THRESHOLD as string, 10),
      );
    });

    it('should get webhook retry interval seconds', () => {
      expect(graphWorkerConfig.webhookRetryIntervalSeconds).toStrictEqual(
        parseInt(ALL_ENV.WEBHOOK_RETRY_INTERVAL_SECONDS as string, 10),
      );
    });
  });
});
