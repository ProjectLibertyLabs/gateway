/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { RequestProcessorService } from './request.processor.service';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';
import { IPFSStorageModule } from '#storage';

@Module({
  imports: [IPFSStorageModule],
  providers: [RequestProcessorService, DsnpAnnouncementProcessor],
  exports: [RequestProcessorService, DsnpAnnouncementProcessor],
})
export class RequestProcessorModule {}
