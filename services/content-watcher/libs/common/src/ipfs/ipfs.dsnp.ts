import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { Processor } from '@nestjs/bullmq';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CID } from 'multiformats';
import { hexToString } from '@polkadot/util';
import { PalletSchemasSchema } from '@polkadot/types/lookup';
import { fromFrequencySchema } from '@dsnp/frequency-schemas/parquet';
import parquet from '@dsnp/parquetjs';
import { ConfigService } from '../config/config.service';
import { QueueConstants } from '..';
import { IIPFSJob } from '../interfaces/ipfs.job.interface';
import { BaseConsumer } from '../utils/base-consumer';
import { IpfsService } from '../utils/ipfs.client';
import { BlockchainService } from '../blockchain/blockchain.service';
import { RedisUtils } from '../utils/redis';

@Injectable()
@Processor(QueueConstants.IPFS_QUEUE, {
  concurrency: 2,
})
export class IPFSContentProcessor extends BaseConsumer {
  public logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
    private ipfsService: IpfsService,
    private blockchainService: BlockchainService,
  ) {
    super();
  }

  async process(job: Job<IIPFSJob, any, string>): Promise<any> {
    try {
      this.logger.log(`IPFS Processing job ${job.id}`);
      this.logger.debug(`IPFS CID: ${job.data.cid} for schemaId: ${job.data.schemaId}`);
      const cid = CID.parse(job.data.cid);

      const ipfsHash = cid.toV0().toString();
      this.logger.debug(`IPFS Hash: ${ipfsHash}`);

      const contentBuffer = await this.ipfsService.getPinned(ipfsHash);
      const schemaCacheKey = `schema:${job.data.schemaId}`;
      let cachedSchema: string | null = await this.redis.get(schemaCacheKey);
      if (!cachedSchema) {
        const schemaResponse = await this.blockchainService.getSchema(job.data.schemaId);
        cachedSchema = JSON.stringify(schemaResponse);
        await this.redis.setex(schemaCacheKey, RedisUtils.STORAGE_EXPIRE_UPPER_LIMIT_SECONDS, cachedSchema);
      }

      const frequencySchema: PalletSchemasSchema = JSON.parse(cachedSchema);
      const hexString: string = Buffer.from(frequencySchema.model).toString('utf8');
      const schema = JSON.parse(hexToString(hexString));
      if (!schema) {
        throw new Error(`Unable to parse schema for schemaId ${job.data.schemaId}`);
      }

      const reader = await parquet.ParquetReader.openBuffer(contentBuffer);
      const cursor = reader.getCursor();
      const records = [];
    } catch (e) {
      this.logger.error(`IPFS Job ${job.id} failed with error: ${e}`);
      throw e;
    }
  }
}
