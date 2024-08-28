import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { configModuleOptions } from './env.config';

@Module({})
export class ConfigModule {
  static forRoot(allowReadOnly = false) {
    return {
      module: ConfigModule,
      global: true,
      imports: [NestConfigModule.forRoot(configModuleOptions(allowReadOnly))],
      controllers: [],
      providers: [ConfigService],
      exports: [ConfigService],
    };
  }
}
