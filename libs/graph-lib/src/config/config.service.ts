/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { EnvironmentType } from '@dsnp/graph-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface ConfigEnvironmentVariables {
  API_PORT: number;
  GRAPH_ENVIRONMENT_TYPE: keyof EnvironmentType;
}

/// Config service to get global app and provider-specific config values.
@Injectable()
export class ConfigService {
  private logger: Logger;

  constructor(private nestConfigService: NestConfigService<ConfigEnvironmentVariables>) {
    this.logger = new Logger(this.constructor.name);
  }

  public get apiPort(): number {
    return this.nestConfigService.get<number>('API_PORT')!;
  }

  public get graphEnvironmentType(): keyof EnvironmentType {
    return this.nestConfigService.get<keyof EnvironmentType>('GRAPH_ENVIRONMENT_TYPE')!;
  }
}
