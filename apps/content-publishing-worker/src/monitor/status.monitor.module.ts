import { Module } from '@nestjs/common';
import { TxStatusMonitoringService } from './tx.status.monitor.service';

@Module({
  imports: [],
  controllers: [],
  providers: [TxStatusMonitoringService],
  exports: [TxStatusMonitoringService],
})
export class StatusMonitorModule {}
