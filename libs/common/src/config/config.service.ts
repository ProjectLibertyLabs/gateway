/*
https://docs.nestjs.com/providers#services
*/

import { EnvironmentType } from '@dsnp/graph-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface ConfigEnvironmentVariables {
  REDIS_URL: URL;
  FREQUENCY_URL: URL;
  QUEUE_HIGH_WATER: number;
  API_PORT: number;
  GRAPH_ENVIRONMENT_TYPE: keyof EnvironmentType;
  GRAPH_ENVIRONMENT_DEV_CONFIG?: string;
  PROVIDER_ACCOUNT_SEED_PHRASE: string;
}

/// Config service to get global app and provider-specific config values.
@Injectable()
export class ConfigService {
  private logger: Logger;

  constructor(private nestConfigService: NestConfigService<ConfigEnvironmentVariables>) {
    this.logger = new Logger(this.constructor.name);
  }

  public getQueueHighWater(): number {
    return this.nestConfigService.get<number>('QUEUE_HIGH_WATER')!;
  }

  public getApiPort(): number {
    return this.nestConfigService.get<number>('API_PORT')!;
  }

  public getRedisUrl(): URL {
    return this.nestConfigService.get<URL>('REDIS_URL')!;
  }

  public getFrequencyUrl(): URL {
    return this.nestConfigService.get<URL>('FREQUENCY_URL')!;
  }

  public getGraphEnvironmentType(): keyof EnvironmentType {
    return this.nestConfigService.get<keyof EnvironmentType>('GRAPH_ENVIRONMENT_TYPE')!;
  }

  public getGraphEnvironmentConfig(): string {
    return this.nestConfigService.get<string>('GRAPH_ENVIRONMENT_DEV_CONFIG')!;
  }

  public getProviderAccountSeedPhrase(): string {
    return this.nestConfigService.get<string>('PROVIDER_ACCOUNT_SEED_PHRASE')!;
  }

  public get redisUrl(): URL {
    return this.nestConfigService.get('REDIS_URL')!;
  }

  public get frequencyUrl(): URL {
    return this.nestConfigService.get('FREQUENCY_URL')!;
  }
}
