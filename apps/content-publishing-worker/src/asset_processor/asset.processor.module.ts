import { Module } from '@nestjs/common';
import { AssetProcessorService } from './asset.processor.service';
import { IPFSStorageModule } from '#storage';

@Module({
  imports: [IPFSStorageModule],
  providers: [AssetProcessorService],
  exports: [AssetProcessorService],
})
export class AssetProcessorModule {}
