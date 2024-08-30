import { Module } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { IPFSPublisher } from './ipfs.publisher';
import { NonceService } from './nonce.service';
import { BlockchainModule } from '#libs/blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [],
  providers: [PublishingService, IPFSPublisher, NonceService],
  exports: [PublishingService, IPFSPublisher],
})
export class PublisherModule {}
