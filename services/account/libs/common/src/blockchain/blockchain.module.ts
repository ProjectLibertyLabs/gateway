/*
https://docs.nestjs.com/modules
*/
import '@frequency-chain/api-augment';

import { Module } from '@nestjs/common';
import { ConfigModule } from '#lib/config/config.module';
import { BlockchainService } from './blockchain.service';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
