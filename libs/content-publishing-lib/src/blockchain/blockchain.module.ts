import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { CapacityCheckerService } from './capacity-checker.service';

@Module({
  imports: [],
  controllers: [],
  providers: [BlockchainService, CapacityCheckerService],
  exports: [BlockchainService, CapacityCheckerService],
})
export class BlockchainModule {}
