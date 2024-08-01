import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TxStatusMonitoringService } from './tx.status.monitor.service';
import { BlockchainModule } from '#libs/blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule, EventEmitterModule],
  controllers: [],
  providers: [TxStatusMonitoringService],
  exports: [TxStatusMonitoringService],
})
export class StatusMonitorModule {}
