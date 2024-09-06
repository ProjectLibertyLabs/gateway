import { Module } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { IPFSContentProcessor } from './ipfs.dsnp';
import { IpfsService } from '../utils/ipfs.client';

@Module({
  imports: [BlockchainModule],
  controllers: [],
  providers: [IPFSContentProcessor, IpfsService],
  exports: [IPFSContentProcessor, IpfsService],
})
export class IPFSProcessorModule {}
