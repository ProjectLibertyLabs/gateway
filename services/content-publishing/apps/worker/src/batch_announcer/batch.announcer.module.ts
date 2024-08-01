import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BatchAnnouncementService } from './batch.announcer.service';
import { BatchAnnouncer } from './batch.announcer';
import { BlockchainModule } from '#libs/blockchain/blockchain.module';
import { IpfsService } from '#libs/utils/ipfs.client';

@Module({
  imports: [BlockchainModule, EventEmitterModule],
  controllers: [],
  providers: [BatchAnnouncementService, BatchAnnouncer, IpfsService],
  exports: [BatchAnnouncementService, BatchAnnouncer, IpfsService],
})
export class BatchAnnouncerModule {}
