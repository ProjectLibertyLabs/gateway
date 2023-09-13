import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { configModuleOptions } from './env.config';

@Module({
  imports: [NestConfigModule.forRoot(configModuleOptions)],
  controllers: [],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
