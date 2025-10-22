import { Module } from '@nestjs/common';
import { IpfsService } from '#storage/ipfs/ipfs.service';
import { IpfsClusterService } from '#storage/ipfs/ipfs.cluster.service';

@Module({
  imports: [],
  controllers: [],
  providers: [IpfsService, IpfsClusterService],
  exports: [IpfsService, IpfsClusterService],
})
export class IPFSStorageModule {}
