import { Module } from '@nestjs/common';
import { IPFSContentProcessor } from './ipfs.dsnp';
import { IpfsService } from '../utils/ipfs.client';

@Module({
  imports: [],
  controllers: [],
  providers: [IPFSContentProcessor, IpfsService],
  exports: [IPFSContentProcessor, IpfsService],
})
export class IPFSProcessorModule {}
