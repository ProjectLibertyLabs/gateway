import { Module } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { IPFSPublisher } from './ipfs.publisher';

@Module({
  imports: [],
  controllers: [],
  providers: [PublishingService, IPFSPublisher],
  exports: [PublishingService, IPFSPublisher],
})
export class PublisherModule {}
