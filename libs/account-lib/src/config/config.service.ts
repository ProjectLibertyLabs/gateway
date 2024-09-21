/* eslint-disable class-methods-use-this */
import { EnvironmentType } from '@dsnp/graph-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface ConfigEnvironmentVariables {
  FREQUENCY_HTTP_URL: URL;
  API_PORT: number;
  GRAPH_ENVIRONMENT_TYPE: keyof EnvironmentType;
  BLOCKCHAIN_SCAN_INTERVAL_SECONDS: number;
  TRUST_UNFINALIZED_BLOCKS: boolean;
  SIWF_URL: string;
  WEBHOOK_BASE_URL: string;
  PROVIDER_ACCESS_TOKEN: string;
  WEBHOOK_FAILURE_THRESHOLD: number;
  HEALTH_CHECK_SUCCESS_THRESHOLD: number;
  WEBHOOK_RETRY_INTERVAL_SECONDS: number;
  HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: number;
  HEALTH_CHECK_MAX_RETRIES: number;
  API_TIMEOUT_MS: number;
  API_BODY_JSON_LIMIT: string;
}

/// Config service to get global app and provider-specific config values.
@Injectable()
export class ConfigService {
  private readonly logger: Logger;

  constructor(private nestConfigService: NestConfigService<ConfigEnvironmentVariables, true>) {
    this.logger = new Logger(ConfigService.name);
  }
}
