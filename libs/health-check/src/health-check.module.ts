import { DynamicModule, Module, Provider } from '@nestjs/common';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { LoggerModule } from 'nestjs-pino/LoggerModule';
import { getPinoHttpOptions } from '#logger-lib';

import { HealthCheckService } from './health-check.service';
import { HEALTH_CONFIGS } from '#types/constants/health-check.constants';

export interface HealthModuleOptions {
  // The list of config provider tokens
  configKeys: ConfigFactoryKeyHost['KEY'][];
}

@Module({})
export class HealthCheckModule {
  static forRoot(options: HealthModuleOptions): DynamicModule {
    const registeredConfigsProvider: Provider = {
      provide: HEALTH_CONFIGS,
      useFactory: (...registeredConfigs: any[]) => registeredConfigs,
      inject: options.configKeys,
    };

    return {
      module: HealthCheckModule,
      imports: [LoggerModule.forRoot(getPinoHttpOptions()), BlockchainModule.forRootAsync({ readOnly: true })],
      providers: [registeredConfigsProvider, HealthCheckService],
      exports: [HealthCheckService],
    };
  }
}
