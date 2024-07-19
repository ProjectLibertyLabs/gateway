import '@frequency-chain/api-augment';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScannerService } from './scanner.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule, ScheduleModule],
  controllers: [],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
