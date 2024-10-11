import { Module } from '@nestjs/common';
import { IPFSStorageModule } from '#storage/ipfs/ipfs.module';
import { IPFSContentProcessor } from './ipfs.processor';

@Module({
  imports: [IPFSStorageModule],
  controllers: [],
  providers: [IPFSContentProcessor],
  exports: [IPFSContentProcessor],
})
export class IPFSProcessorModule {}
