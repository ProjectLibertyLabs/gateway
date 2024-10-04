import { Module } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { IPFSPublisher } from './ipfs.publisher';
import { BlockchainModule } from '#blockchain/blockchain.module';

@Module({
  imports: [],
  controllers: [],
  providers: [PublishingService, IPFSPublisher],
  exports: [PublishingService, IPFSPublisher],
})
export class PublisherModule {}
