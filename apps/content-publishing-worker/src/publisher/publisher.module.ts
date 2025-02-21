import { Module } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { MessagePublisher } from './message.publisher';

@Module({
  imports: [],
  controllers: [],
  providers: [PublishingService, MessagePublisher],
  exports: [PublishingService, MessagePublisher],
})
export class PublisherModule {}
