import { registerAs } from '@nestjs/config';
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

export default createRateLimitingConfig;
