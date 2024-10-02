import { Module } from '@nestjs/common';
import { BatchAnnouncementService } from './batch.announcer.service';
import { BatchAnnouncer } from './batch.announcer';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { IpfsService } from '#content-publishing-lib/utils/ipfs.client';

@Module({
  imports: [BlockchainModule],
  controllers: [],
  providers: [BatchAnnouncementService, BatchAnnouncer, IpfsService],
  exports: [BatchAnnouncementService, BatchAnnouncer, IpfsService],
})
export class BatchAnnouncerModule {}
