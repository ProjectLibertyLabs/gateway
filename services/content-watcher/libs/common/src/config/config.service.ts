/*
https://docs.nestjs.com/providers#services
*/

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface ConfigEnvironmentVariables {
  IPFS_ENDPOINT: URL;
  IPFS_GATEWAY_URL: URL;
  IPFS_BASIC_AUTH_USER: string;
  IPFS_BASIC_AUTH_SECRET: string;
  REDIS_URL: URL;
  FREQUENCY_URL: URL;
  STARTING_BLOCK: string;
  BLOCKCHAIN_SCAN_INTERVAL_MINUTES: number;
  QUEUE_HIGH_WATER: number;
  HEALTH_CHECK_SUCCESS_THRESHOLD: number;
  HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: number;
  HEALTH_CHECK_MAX_RETRIES: number;
  WEB_HOOK_POST_MAX_RETRIES: number;
  API_PORT: number;
}

/// Config service to get global app and provider-specific config values.
@Injectable()
export class ConfigService {
  private logger: Logger;

  constructor(private nestConfigService: NestConfigService<ConfigEnvironmentVariables>) {
    this.logger = new Logger(this.constructor.name);
  }

  public get redisUrl(): URL {
    return this.nestConfigService.get('REDIS_URL')!;
  }

  public get frequencyUrl(): URL {
    return this.nestConfigService.get('FREQUENCY_URL')!;
  }

  public get startingBlock(): string {
    return this.nestConfigService.get('STARTING_BLOCK')!;
  }

  public getBlockchainScanIntervalMinutes(): number {
    return this.nestConfigService.get<number>('BLOCKCHAIN_SCAN_INTERVAL_MINUTES') ?? 1;
  }

  public getQueueHighWater(): number {
    return this.nestConfigService.get<number>('QUEUE_HIGH_WATER')!;
  }

  public getHealthCheckSuccessThreshold(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_SUCCESS_THRESHOLD')!;
  }

  public getHealthCheckMaxRetryIntervalSeconds(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS')!;
  }

  public getHealthCheckMaxRetries(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_MAX_RETRIES')!;
  }

  public getIpfsEndpoint(): string {
    return this.nestConfigService.get<string>('IPFS_ENDPOINT')!;
  }

  public getIpfsGatewayUrl(): string {
    return this.nestConfigService.get<string>('IPFS_GATEWAY_URL')!;
  }

  public getIpfsBasicAuthUser(): string {
    return this.nestConfigService.get<string>('IPFS_BASIC_AUTH_USER')!;
  }

  public getIpfsBasicAuthSecret(): string {
    return this.nestConfigService.get<string>('IPFS_BASIC_AUTH_SECRET')!;
  }

  public getIpfsCidPlaceholder(cid): string {
    const gatewayUrl = this.getIpfsGatewayUrl();
    if (!gatewayUrl || !gatewayUrl.includes('[CID]')) {
      return `https://ipfs.io/ipfs/${cid}`;
    }
    return gatewayUrl.replace('[CID]', cid);
  }

  public getApiPort(): number {
    return this.nestConfigService.get<number>('API_PORT')!;
  }

  public getWebookMaxRetries(): number {
    return this.nestConfigService.get<number>('WEB_HOOK_POST_MAX_RETRIES')!;
  }
}
