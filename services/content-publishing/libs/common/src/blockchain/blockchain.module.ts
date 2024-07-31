import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

@Module({
  imports: [],
  controllers: [],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
