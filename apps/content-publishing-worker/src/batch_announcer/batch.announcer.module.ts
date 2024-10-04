import { Module } from '@nestjs/common';
import { BatchAnnouncementService } from './batch.announcer.service';
import { BatchAnnouncer } from './batch.announcer';
import { BlockchainModule } from '#content-publishing-lib/blockchain/blockchain.module';
import { IPFSStorageModule } from '#storage';

@Module({
  imports: [BlockchainModule, IPFSStorageModule],
  controllers: [],
  providers: [BatchAnnouncementService, BatchAnnouncer],
  exports: [BatchAnnouncementService, BatchAnnouncer],
})
export class BatchAnnouncerModule {}
