import { Module } from '@nestjs/common';
import { GraphUpdatePublisherService } from './graph.publisher.processor.service';
import { NonceService } from '#graph-lib/services/nonce.service';
import { BlockchainModule } from '#graph-lib/blockchain';

@Module({
  imports: [BlockchainModule],
  providers: [GraphUpdatePublisherService, NonceService],
  exports: [GraphUpdatePublisherService, NonceService],
})
export class GraphUpdatePublisherModule {}
