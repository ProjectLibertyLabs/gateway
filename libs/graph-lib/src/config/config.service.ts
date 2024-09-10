/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { EnvironmentType } from '@dsnp/graph-sdk';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { ICapacityLimits } from '#types/interfaces/graph/capacity-limit.interface';
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

export interface ConfigEnvironmentVariables {
  REDIS_URL: URL;
  FREQUENCY_URL: URL;
  QUEUE_HIGH_WATER: number;
  API_PORT: number;
  DEBOUNCE_SECONDS: number;
  GRAPH_ENVIRONMENT_TYPE: keyof EnvironmentType;
  PROVIDER_ACCOUNT_SEED_PHRASE: string;
  PROVIDER_ID: string;
  RECONNECTION_SERVICE_REQUIRED: boolean;
  BLOCKCHAIN_SCAN_INTERVAL_SECONDS: number;
  PROVIDER_BASE_URL: string;
  PROVIDER_ACCESS_TOKEN: string;
  WEBHOOK_FAILURE_THRESHOLD: number;
  HEALTH_CHECK_SUCCESS_THRESHOLD: number;
  WEBHOOK_RETRY_INTERVAL_SECONDS: number;
  HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS: number;
  HEALTH_CHECK_MAX_RETRIES: number;
  CONNECTIONS_PER_PROVIDER_RESPONSE_PAGE: number;
  CAPACITY_LIMIT: number;
  CACHE_KEY_PREFIX: string;
  TRUST_UNFINALIZED_BLOCKS: boolean;
}

/// Config service to get global app and provider-specific config values.
@Injectable()
export class ConfigService implements OnModuleInit {
  public readonly capacityLimit: ICapacityLimits;

  private providerAddress: string;

  private logger: Logger;

  async onModuleInit() {
    await cryptoWaitReady();

    const { providerAccountSeedPhrase } = this;

    if (providerAccountSeedPhrase) {
      this.providerAddress = new Keyring({ type: 'sr25519' }).createFromUri(providerAccountSeedPhrase).address;
    } else {
      this.logger.log('******* Running in READ-ONLY mode; chain-modifying endpoints will be disabled **********');
    }
  }

  constructor(private nestConfigService: NestConfigService<ConfigEnvironmentVariables>) {
    this.logger = new Logger(this.constructor.name);
    const obj = JSON.parse(nestConfigService.get('CAPACITY_LIMIT') ?? '{}', (key, value) => {
      if (key === 'value') {
        return BigInt(value);
      }

      return value;
    });

    if (obj?.type) {
      this.capacityLimit = {
        serviceLimit: obj,
      };
    } else {
      this.capacityLimit = obj;
    }
  }

  public get isReadOnly(): boolean {
    return !this.providerAccountSeedPhrase;
  }

  public get providerPublicKeyAddress(): string | undefined {
    return this.providerAddress;
  }

  public get trustUnfinalizedBlocks(): boolean {
    return this.nestConfigService.get<boolean>('TRUST_UNFINALIZED_BLOCKS') ?? false;
  }

  public get cacheKeyPrefix(): string {
    return this.nestConfigService.get('CACHE_KEY_PREFIX')!;
  }

  public get providerBaseUrl(): URL {
    return this.nestConfigService.get<URL>('PROVIDER_BASE_URL')!;
  }

  public get providerApiToken(): string | undefined {
    return this.nestConfigService.get<string>('PROVIDER_ACCESS_TOKEN');
  }

  public get providerId(): string {
    return this.nestConfigService.get<string>('PROVIDER_ID')!;
  }

  public get queueHighWater(): number {
    return this.nestConfigService.get<number>('QUEUE_HIGH_WATER')!;
  }

  public get apiPort(): number {
    return this.nestConfigService.get<number>('API_PORT')!;
  }

  public get reconnectionServiceRequired(): boolean {
    return this.nestConfigService.get<boolean>('RECONNECTION_SERVICE_REQUIRED')!;
  }

  public get blockchainScanIntervalSeconds(): number {
    return this.nestConfigService.get<number>('BLOCKCHAIN_SCAN_INTERVAL_SECONDS')!;
  }

  public get graphEnvironmentType(): keyof EnvironmentType {
    return this.nestConfigService.get<keyof EnvironmentType>('GRAPH_ENVIRONMENT_TYPE')!;
  }

  public get providerAccountSeedPhrase(): string {
    return this.nestConfigService.get<string>('PROVIDER_ACCOUNT_SEED_PHRASE')!;
  }

  public get redisUrl(): URL {
    return this.nestConfigService.get('REDIS_URL')!;
  }

  public get redisConnectionOptions() {
    // Note: BullMQ doesn't honor a URL for the Redis connection, and
    // JS URL doesn't parse 'redis://' as a valid protocol, so we fool
    // it by changing the URL to use 'http://' in order to parse out
    // the host, port, username, password, etc.
    // We could pass REDIS_HOST, REDIS_PORT, etc, in the environment, but
    // trying to keep the # of environment variables from proliferating
    const url = new URL(this.redisUrl.toString().replace(/^redis[s]*/, 'http'));
    const { hostname, port, username, password, pathname } = url;
    return {
      host: hostname || undefined,
      port: port ? Number(port) : undefined,
      username: username || undefined,
      password: password || undefined,
      db: pathname?.length > 1 ? Number(pathname.slice(1)) : undefined,
    };
  }

  public get frequencyUrl(): URL {
    return this.nestConfigService.get('FREQUENCY_URL')!;
  }

  public get healthCheckMaxRetries(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_MAX_RETRIES')!;
  }

  public get healthCheckMaxRetryIntervalSeconds(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_MAX_RETRY_INTERVAL_SECONDS')!;
  }

  public get healthCheckSuccessThreshold(): number {
    return this.nestConfigService.get<number>('HEALTH_CHECK_SUCCESS_THRESHOLD')!;
  }

  public get webhookFailureThreshold(): number {
    return this.nestConfigService.get<number>('WEBHOOK_FAILURE_THRESHOLD')!;
  }

  public get webhookRetryIntervalSeconds(): number {
    return this.nestConfigService.get('WEBHOOK_RETRY_INTERVAL_SECONDS')!;
  }

  public get pageSize(): number {
    return this.nestConfigService.get('CONNECTIONS_PER_PROVIDER_RESPONSE_PAGE')!;
  }

  public get debounceSeconds(): number {
    return this.nestConfigService.get<number>('DEBOUNCE_SECONDS')!;
  }
}
