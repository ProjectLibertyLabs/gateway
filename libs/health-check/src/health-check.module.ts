import { Module } from '@nestjs/common';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { LoggerModule } from 'nestjs-pino/LoggerModule';
import { getPinoHttpOptions } from '#logger-lib';
import { QueueModule } from '#queue/queue.module';
import { ContentPublishingQueues } from '#types/constants';

import { HealthCheckService } from './health-check.service';

@Module({
  imports: [
    LoggerModule.forRoot(getPinoHttpOptions()),
    BlockchainModule.forRootAsync({ readOnly: true }),
    QueueModule.forRoot({ enableUI: false, ...ContentPublishingQueues.CONFIGURED_QUEUES }),
  ],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthCheckModule {}
