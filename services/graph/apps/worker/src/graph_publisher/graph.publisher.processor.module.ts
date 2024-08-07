import { Module } from '@nestjs/common';
import { BlockchainModule, NonceService } from '#lib';
import { GraphUpdatePublisherService } from './graph.publisher.processor.service';

@Module({
  imports: [BlockchainModule],
  providers: [GraphUpdatePublisherService, NonceService],
  exports: [GraphUpdatePublisherService, NonceService],
})
export class GraphUpdatePublisherModule {}
