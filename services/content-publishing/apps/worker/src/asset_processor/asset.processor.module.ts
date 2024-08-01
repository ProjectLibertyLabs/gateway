import { ConfigService } from '#libs/config';
import { IpfsService } from '#libs/utils/ipfs.client';
import { Module } from '@nestjs/common';
import { RedisModule } from '@songkeys/nestjs-redis';
import { AssetProcessorService } from './asset.processor.service';

@Module({
  imports: [
    RedisModule.forRootAsync(
      {
        useFactory: (configService: ConfigService) => ({
          config: [{ url: configService.redisUrl.toString() }],
        }),
        inject: [ConfigService],
      },
      true, // isGlobal
    ),
  ],
  providers: [AssetProcessorService, IpfsService],
  exports: [AssetProcessorService, IpfsService],
})
export class AssetProcessorModule {}
