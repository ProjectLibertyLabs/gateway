/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { RequestProcessorService } from './request.processor.service';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';
import { DsnpAnnouncementProcessor } from './dsnp.announcement.processor';

@Module({
  imports: [],
  providers: [RequestProcessorService, IpfsService, DsnpAnnouncementProcessor],
  exports: [RequestProcessorService, IpfsService, DsnpAnnouncementProcessor],
})
export class RequestProcessorModule {}
