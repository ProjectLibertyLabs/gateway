import { IpfsService } from '#libs/utils/ipfs.client';
import { Module } from '@nestjs/common';
import { AssetProcessorService } from './asset.processor.service';

@Module({
  imports: [],
  providers: [AssetProcessorService, IpfsService],
  exports: [AssetProcessorService, IpfsService],
})
export class AssetProcessorModule {}
