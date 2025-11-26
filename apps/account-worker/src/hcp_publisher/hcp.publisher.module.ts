import { Module } from '@nestjs/common';
import { BlockchainModule } from '#blockchain/blockchain.module';
import { HcpPublisherService } from './hcp.publisher.service';

@Module({
  imports: [BlockchainModule],
  providers: [HcpPublisherService],
  exports: [HcpPublisherService],
})
export class HcpPublisherModule {}
