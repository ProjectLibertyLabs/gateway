import { Module } from '@nestjs/common';
import { TxStatusMonitoringService } from './tx.status.monitor.service';
import { BlockchainModule } from '#libs/blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [],
  providers: [TxStatusMonitoringService],
  exports: [TxStatusMonitoringService],
})
export class StatusMonitorModule {}
