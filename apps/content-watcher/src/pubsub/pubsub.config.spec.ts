import { describe, it, expect, beforeAll } from '@jest/globals';
import pubsubConfig, { IPubSubConfig } from './pubsub.config';
import configSetup from '#testlib/utils.config-tests';

const { setupConfigService, shouldFailBadValues } = configSetup<IPubSubConfig>(pubsubConfig);

describe('PubSub config', () => {
  const ALL_ENV: Record<string, string | undefined> = {
    WEBHOOK_FAILURE_THRESHOLD: undefined,
    WEBHOOK_RETRY_INTERVAL_SECONDS: undefined,
  };

  beforeAll(() => {
    Object.keys(ALL_ENV).forEach((key) => {
      ALL_ENV[key] = process.env[key];
    });
  });

  describe('invalid environment', () => {
    it('invalid webhook failure threshold should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'WEBHOOK_FAILURE_THRESHOLD', [-1, 'bad-value']));

    it('invalid webhook retry interval should fail', async () =>
      shouldFailBadValues(ALL_ENV, 'WEBHOOK_RETRY_INTERVAL_SECONDS', [0, 'bad-value']));
  });

  describe('valid environment', () => {
    let pubSubConf: IPubSubConfig;
    beforeAll(async () => {
      pubSubConf = await setupConfigService(ALL_ENV);
    });

    it('should be defined', () => {
      expect(pubSubConf).toBeDefined();
    });

    it('should get webhook failure threshold', async () => {
      expect(pubSubConf.webhookMaxRetries).toStrictEqual(parseInt(ALL_ENV.WEBHOOK_FAILURE_THRESHOLD, 10));
    });

    it('should get webhook retry interval', async () => {
      expect(pubSubConf.webhookRetryIntervalSeconds).toEqual(parseInt(ALL_ENV.WEBHOOK_RETRY_INTERVAL_SECONDS, 10));
    });
  });
});
