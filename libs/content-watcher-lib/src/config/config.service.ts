/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ConfigEnvironmentVariables {
  IPFS_ENDPOINT: URL;
  IPFS_GATEWAY_URL: URL;
  IPFS_BASIC_AUTH_USER: string;
  IPFS_BASIC_AUTH_SECRET: string;
  REDIS_URL: URL;
  FREQUENCY_URL: URL;
  BLOCKCHAIN_SCAN_INTERVAL_SECONDS: number;
  QUEUE_HIGH_WATER: number;
  WEBHOOK_FAILURE_THRESHOLD: number;
  WEBHOOK_RETRY_INTERVAL_SECONDS: number;
  API_PORT: number;
  CACHE_KEY_PREFIX: string;
}

/// Config service to get global app and provider-specific config values.
@Injectable()
export class AppConfigService {
  private logger: Logger;

  constructor(private nestConfigService: ConfigService<ConfigEnvironmentVariables>) {
    this.logger = new Logger(this.constructor.name);
  }

  public get redisUrl(): URL {
    return this.nestConfigService.get('REDIS_URL')!;
  }

  public get cacheKeyPrefix(): string {
    return this.nestConfigService.get('CACHE_KEY_PREFIX')!;
  }

  public get frequencyUrl(): URL {
    return this.nestConfigService.get('FREQUENCY_URL')!;
  }

  public get blockchainScanIntervalSeconds(): number {
    return this.nestConfigService.get<number>('BLOCKCHAIN_SCAN_INTERVAL_SECONDS') ?? 12;
  }

  public get queueHighWater(): number {
    return this.nestConfigService.get<number>('QUEUE_HIGH_WATER')!;
  }

  public get ipfsEndpoint(): string {
    return this.nestConfigService.get<string>('IPFS_ENDPOINT')!;
  }

  public get ipfsGatewayUrl(): string {
    return this.nestConfigService.get<string>('IPFS_GATEWAY_URL')!;
  }

  public get ipfsBasicAuthUser(): string {
    return this.nestConfigService.get<string>('IPFS_BASIC_AUTH_USER')!;
  }

  public get ipfsBasicAuthSecret(): string {
    return this.nestConfigService.get<string>('IPFS_BASIC_AUTH_SECRET')!;
  }

  public getIpfsCidPlaceholder(cid: string): string {
    const gatewayUrl = this.ipfsGatewayUrl;
    if (!gatewayUrl || !gatewayUrl.includes('[CID]')) {
      return `https://ipfs.io/ipfs/${cid}`;
    }
    return gatewayUrl.replace('[CID]', cid);
  }

  public get apiPort(): number {
    return this.nestConfigService.get<number>('API_PORT')!;
  }

  public get webookMaxRetries(): number {
    return this.nestConfigService.get<number>('WEBHOOK_FAILURE_THRESHOLD')!;
  }

  public get webhookRetryIntervalSeconds(): number {
    return this.nestConfigService.get<number>('WEBHOOK_RETRY_INTERVAL_SECONDS')!;
  }
}
