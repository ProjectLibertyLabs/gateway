/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ConfigModule } from '../../../api/src/config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
