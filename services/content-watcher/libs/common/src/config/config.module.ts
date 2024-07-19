import { ConfigModule } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './config.service';
import { configModuleOptions } from './env.config';

@Global()
@Module({
  imports: [ConfigModule.forRoot(configModuleOptions)],
  controllers: [],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
