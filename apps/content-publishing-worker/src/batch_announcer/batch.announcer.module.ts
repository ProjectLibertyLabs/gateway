import { Module } from '@nestjs/common';
import { BatchAnnouncementService } from './batch.announcer.service';
import { BatchAnnouncer } from './batch.announcer';
import { IPFSStorageModule } from '#storage';

@Module({
  imports: [IPFSStorageModule],
  controllers: [],
  providers: [BatchAnnouncementService, BatchAnnouncer],
  exports: [BatchAnnouncementService, BatchAnnouncer],
})
export class BatchAnnouncerModule {}
