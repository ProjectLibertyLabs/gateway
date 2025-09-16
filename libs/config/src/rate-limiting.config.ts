import { registerAs } from '@nestjs/config';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { ICacheConfig } from '#cache/cache.config';
import Joi from 'joi';
import { JoiUtils } from '#config';

export interface IRateLimitingConfig {
  /**
   * Rate limiting time window in ms
   */
  ttl: number;
  /**
   * Maximum number of requests per ttl window
   */
  limit: number;
  /**
   * Whether to skip successful requests when counting
   */
  skipSuccessfulRequests: boolean;
  /**
   * Whether to skip failed requests when counting
   */
  skipFailedRequests: boolean;
  /**
   * Whether to block requests when rate limit is exceeded
   */
  blockOnQuotaExceeded: boolean;
  /**
   * Service-specific key prefix for Redis storage
   */
  keyPrefix: string;
}

/**
 * Creates a rate limiting configuration for a specific service
 * @param serviceName - Name of the service (e.g., 'account', 'content-publishing')
 */
export const createRateLimitingConfig = (serviceName: string) => {
  return registerAs('rate-limiting', (): IRateLimitingConfig => {
    const configs: JoiUtils.JoiConfig<IRateLimitingConfig> = JoiUtils.normalizeConfigNames({
      ttl: {
        label: 'RATE_LIMIT_TTL',
        joi: Joi.number().min(1).default(60000),
      },
      limit: {
        label: 'RATE_LIMIT_MAX_REQUESTS',
        joi: Joi.number().min(1).default(100),
      },
      skipSuccessfulRequests: {
        label: 'RATE_LIMIT_SKIP_SUCCESS',
        joi: Joi.boolean().default(false),
      },
      skipFailedRequests: {
        label: 'RATE_LIMIT_SKIP_FAILED',
        joi: Joi.boolean().default(false),
      },
      blockOnQuotaExceeded: {
        label: 'RATE_LIMIT_BLOCK_ON_EXCEEDED',
        joi: Joi.boolean().default(true),
      },
      keyPrefix: {
        label: 'RATE_LIMIT_KEY_PREFIX',
        joi: Joi.string().default(`${serviceName}:throttle`),
      },
    });

    return JoiUtils.validate<IRateLimitingConfig>(configs);
  });
};

/**
 * Creates ThrottlerModule configuration factory function
 * @param rateLimitConfig - Rate limiting configuration
 * @param cacheConf - Cache configuration for Redis connection
 * @returns ThrottlerModule configuration object
 */
export const createThrottlerConfig = (rateLimitConfig: IRateLimitingConfig, cacheConf: ICacheConfig) => ({
  throttlers: [
    {
      name: 'default',
      ttl: rateLimitConfig.ttl,
      limit: rateLimitConfig.limit,
    },
  ],
  storage: new ThrottlerStorageRedisService({
    host: cacheConf.redisOptions.host,
    port: cacheConf.redisOptions.port,
    ...(cacheConf.redisOptions.password && { password: cacheConf.redisOptions.password }),
    ...(cacheConf.redisOptions.username && { username: cacheConf.redisOptions.username }),
    keyPrefix: rateLimitConfig.keyPrefix,
  }),
  skipIf: (context) => {
    const response = context.switchToHttp().getResponse();

    // Apply configurable skip rules
    if (rateLimitConfig.skipSuccessfulRequests && response.statusCode < 400) {
      return true;
    }

    if (rateLimitConfig.skipFailedRequests && response.statusCode >= 400) {
      return true;
    }

    return false;
  },
});

export default createRateLimitingConfig;
