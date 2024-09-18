/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { ICapacityLimits } from '#types/interfaces/capacity-limit.interface';
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

export interface ConfigEnvironmentVariables {
  IPFS_ENDPOINT: URL;
  IPFS_GATEWAY_URL: URL;
  IPFS_BASIC_AUTH_USER: string;
  IPFS_BASIC_AUTH_SECRET: string;
  REDIS_URL: URL;
  FREQUENCY_URL: URL;
  PROVIDER_ID: string;
  PROVIDER_ACCOUNT_SEED_PHRASE: string;
  CAPACITY_LIMIT: ICapacityLimits;
  FILE_UPLOAD_MAX_SIZE_IN_BYTES: number;
  API_PORT: number;
  ASSET_EXPIRATION_INTERVAL_SECONDS: number;
  BATCH_INTERVAL_SECONDS: number;
  BATCH_MAX_COUNT: number;
  ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: number;
  BLOCKCHAIN_SCAN_INTERVAL_SECONDS: number;
  TRUST_UNFINALIZED_BLOCKS: boolean;
  CACHE_KEY_PREFIX: string;
}

/// Config service to get global app and provider-specific config values.
@Injectable()
export class ConfigService implements OnModuleInit {
  public readonly capacityLimitObj: ICapacityLimits;

  private providerAddress: string;

  async onModuleInit() {
    await cryptoWaitReady();

    if (this.nestConfigService.get<string>('PROVIDER_ACCOUNT_SEED_PHRASE')) {
      this.providerAddress = new Keyring({ type: 'sr25519' }).createFromUri(this.providerAccountSeedPhrase).address;
    }
  }

  constructor(private nestConfigService: NestConfigService<ConfigEnvironmentVariables>) {
    const obj = JSON.parse(nestConfigService.get('CAPACITY_LIMIT') ?? '{}', (key, value) => {
      if (key === 'value') {
        return BigInt(value);
      }

      return value;
    });

    if (obj?.type) {
      this.capacityLimitObj = {
        serviceLimit: obj,
      };
    } else {
      this.capacityLimitObj = obj;
    }
  }

  public get providerPublicKeyAddress(): string | undefined {
    return this.providerAddress;
  }

  public get cacheKeyPrefix(): string {
    return this.nestConfigService.get<string>('CACHE_KEY_PREFIX')!;
  }

  public get blockchainScanIntervalSeconds(): number {
    return this.nestConfigService.get<number>('BLOCKCHAIN_SCAN_INTERVAL_SECONDS') ?? 12;
  }

  public get trustUnfinalizedBlocks(): boolean {
    return this.nestConfigService.get<boolean>('TRUST_UNFINALIZED_BLOCKS') ?? false;
  }

  public get redisUrl(): URL {
    return this.nestConfigService.get('REDIS_URL')!;
  }

  public get frequencyUrl(): URL {
    return this.nestConfigService.get('FREQUENCY_URL')!;
  }

  public get providerId(): string {
    return this.nestConfigService.get<string>('PROVIDER_ID')!;
  }

  public get providerAccountSeedPhrase(): string {
    return this.nestConfigService.get<string>('PROVIDER_ACCOUNT_SEED_PHRASE')!;
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

  public get fileUploadMaxSizeInBytes(): number {
    return this.nestConfigService.get<number>('FILE_UPLOAD_MAX_SIZE_IN_BYTES')!;
  }

  public get apiPort(): number {
    return this.nestConfigService.get<number>('API_PORT')!;
  }

  public get assetExpirationIntervalSeconds(): number {
    return this.nestConfigService.get<number>('ASSET_EXPIRATION_INTERVAL_SECONDS')!;
  }

  public get batchIntervalSeconds(): number {
    return this.nestConfigService.get<number>('BATCH_INTERVAL_SECONDS')!;
  }

  public get batchMaxCount(): number {
    return this.nestConfigService.get<number>('BATCH_MAX_COUNT')!;
  }

  public get assetUploadVerificationDelaySeconds(): number {
    return this.nestConfigService.get<number>('ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS')!;
  }
}
