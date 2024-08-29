/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { RequestProcessorService } from './request.processor.service';
import { IpfsService } from '#content-publishing-lib/utils/ipfs.client';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';

@Module({
  imports: [],
  providers: [RequestProcessorService, IpfsService, DsnpAnnouncementProcessor],
  exports: [RequestProcessorService, IpfsService, DsnpAnnouncementProcessor],
})
export class RequestProcessorModule {}
