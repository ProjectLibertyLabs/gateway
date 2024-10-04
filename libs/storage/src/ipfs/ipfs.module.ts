import { Module } from '@nestjs/common';
import { IpfsService } from '#storage/ipfs/ipfs.service';

@Module({
  imports: [],
  controllers: [],
  providers: [IpfsService],
  exports: [IpfsService],
})
export class IPFSStorageModule {}
