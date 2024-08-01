import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { configModuleOptions } from './env.config';

@Global()
@Module({
  imports: [NestConfigModule.forRoot(configModuleOptions)],
  controllers: [],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
