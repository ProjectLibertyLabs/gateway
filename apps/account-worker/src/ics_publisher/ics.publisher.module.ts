import { Module } from '@nestjs/common';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { IcsPublisherService } from './ics.publisher.service';

@Module({
  imports: [BlockchainModule],
  providers: [IcsPublisherService],
  exports: [IcsPublisherService],
})
export class IcsPublisherModule {}
