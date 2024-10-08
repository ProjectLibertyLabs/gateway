import { Module } from '@nestjs/common';
import { GraphUpdatePublisherService } from './graph.publisher.processor.service';

@Module({
  imports: [],
  providers: [GraphUpdatePublisherService],
  exports: [GraphUpdatePublisherService],
})
export class GraphUpdatePublisherModule {}
