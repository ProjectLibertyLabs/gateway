import { Module } from '@nestjs/common';
import { IPFSStorageModule } from '#storage/ipfs/ipfs.module';
import { IPFSContentProcessor } from '#content-watcher-lib/ipfs/ipfs.processor';

@Module({
  imports: [IPFSStorageModule],
  controllers: [],
  providers: [IPFSContentProcessor],
  exports: [IPFSContentProcessor],
})
export class IPFSProcessorModule {}
