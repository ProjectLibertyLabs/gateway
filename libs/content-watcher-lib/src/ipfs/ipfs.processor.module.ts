import { Module } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { IPFSStorageModule } from '#storage/ipfs/ipfs.module';
import { IPFSContentProcessor } from '#content-watcher-lib/ipfs/ipfs.processor';

@Module({
  imports: [BlockchainModule, IPFSStorageModule],
  controllers: [],
  providers: [IPFSContentProcessor],
  exports: [IPFSContentProcessor],
})
export class IPFSProcessorModule {}
