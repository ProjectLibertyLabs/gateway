/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EnvironmentDto } from '..';
import { ICapacityLimit } from '../interfaces/capacity-limit.interface';

export interface ConfigEnvironmentVariables {
  ENVIRONMENT: EnvironmentDto;
  IPFS_ENDPOINT: URL;
  IPFS_GATEWAY_URL: URL;
  IPFS_BASIC_AUTH_USER: string;
  IPFS_BASIC_AUTH_SECRET: string;
  REDIS_URL: URL;
  FREQUENCY_URL: URL;
  PROVIDER_ID: string;
  BLOCKCHAIN_SCAN_INTERVAL_MINUTES: number;
  QUEUE_HIGH_WATER: number;
  WEBHOOK_FAILURE_THRESHOLD: number;
  HEALTH_CHECK_SUCCESS_THRESHOLD: number;
  WEBHOOK_RETRY_INTERVAL_SECONDS: number;
  HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: number;
  HEALTH_CHECK_MAX_RETRIES: number;
  PROVIDER_ACCOUNT_SEED_PHRASE: string;
  CAPACITY_LIMIT: ICapacityLimit;
  FILE_UPLOAD_MAX_SIZE_IN_BYTES: number;
  API_PORT: number;
  ASSET_EXPIRATION_INTERVAL_SECONDS: number;
  BATCH_INTERVAL_SECONDS: number;
  BATCH_MAX_COUNT: number;
  ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: number;
}

/// Config service to get global app and provider-specific config values.
@Injectable()
export class ConfigService {
  private capacityLimit: ICapacityLimit;

  constructor(private nestConfigService: NestConfigService<ConfigEnvironmentVariables>) {
    this.capacityLimit = JSON.parse(nestConfigService.get('CAPACITY_LIMIT')!);
  }

  public get environment(): EnvironmentDto {
    return this.nestConfigService.get<EnvironmentDto>('ENVIRONMENT')!;
  }

  public get redisUrl(): URL {
    return this.nestConfigService.get('REDIS_URL')!;
  }

  public get frequencyUrl(): URL {
    return this.nestConfigService.get('FREQUENCY_URL')!;
  }

  public getBlockchainScanIntervalMinutes(): number {
    return this.nestConfigService.get<number>('BLOCKCHAIN_SCAN_INTERVAL_MINUTES') ?? 1;
  }

  public getQueueHighWater(): number {
    return this.nestConfigService.get<number>('QUEUE_HIGH_WATER')!;
  }

  public getWebhookFailureThreshold(): number {
    return this.nestConfigService.get<number>('WEBHOOK_FAILURE_THRESHOLD')!;
  }

  public getHealthCheckSuccessThreshold(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_SUCCESS_THRESHOLD')!;
  }

  public getWebhookRetryIntervalSeconds(): number {
    return this.nestConfigService.get<number>('WEBHOOK_RETRY_INTERVAL_SECONDS')!;
  }

  public getHealthCheckMaxRetryIntervalSeconds(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS')!;
  }

  public getHealthCheckMaxRetries(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_MAX_RETRIES')!;
  }

  public getProviderId(): string {
    return this.nestConfigService.get<string>('PROVIDER_ID')!;
  }

  public getProviderAccountSeedPhrase(): string {
    return this.nestConfigService.get<string>('PROVIDER_ACCOUNT_SEED_PHRASE')!;
  }

  public getCapacityLimit(): ICapacityLimit {
    return this.capacityLimit;
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

  public getFileUploadMaxSizeInBytes(): number {
    return this.nestConfigService.get<number>('FILE_UPLOAD_MAX_SIZE_IN_BYTES')!;
  }

  public getApiPort(): number {
    return this.nestConfigService.get<number>('API_PORT')!;
  }

  public getAssetExpirationIntervalSeconds(): number {
    return this.nestConfigService.get<number>('ASSET_EXPIRATION_INTERVAL_SECONDS')!;
  }

  public getBatchIntervalSeconds(): number {
    return this.nestConfigService.get<number>('BATCH_INTERVAL_SECONDS')!;
  }

  public getBatchMaxCount(): number {
    return this.nestConfigService.get<number>('BATCH_MAX_COUNT')!;
  }

  public getAssetUploadVerificationDelaySeconds(): number {
    return this.nestConfigService.get<number>('ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS')!;
  }
}
