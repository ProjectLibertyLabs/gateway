import { Injectable, Logger } from '@nestjs/common';
import { PassThrough } from 'node:stream';
import { ParquetWriter } from '@dsnp/parquetjs';
import { fromFrequencySchema } from '@dsnp/frequency-schemas/parquet';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { PalletSchemasSchema } from '@polkadot/types/lookup';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '../../../api/src/config/config.service';
import { IBatchAnnouncerJobData } from '../interfaces/batch-announcer.job.interface';
import { IPublisherJob } from '../interfaces/publisher-job.interface';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';

@Injectable()
export class BatchAnnouncer {
  private logger: Logger;

  constructor(
    @InjectRedis() private cacheManager: Redis,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private ipfsService: IpfsService,
  ) {
    this.logger = new Logger(BatchAnnouncer.name);
  }

  public async announce(batchJob: IBatchAnnouncerJobData): Promise<IPublisherJob> {
    this.logger.debug(`Announcing batch ${batchJob.batchId} on IPFS`);
    const { batchId, schemaId, announcements } = batchJob;

    let frequencySchema: PalletSchemasSchema;

    const schemaCacheKey = `schema:${schemaId}`;
    const cachedSchema = await this.cacheManager.get(schemaCacheKey);
    if (cachedSchema) {
      frequencySchema = JSON.parse(cachedSchema);
    } else {
      frequencySchema = await this.blockchainService.getSchema(schemaId);
      await this.cacheManager.set(schemaCacheKey, JSON.stringify(frequencySchema));
    }

    const schema = JSON.parse(frequencySchema.model.toString());
    if (!schema) {
      throw new Error(`Unable to parse schema for schemaId ${schemaId}`);
    }

    const [parquetSchema, writerOptions] = fromFrequencySchema(schema);
    const publishStream = new PassThrough();

    const writer = await ParquetWriter.openStream(parquetSchema, publishStream as any, writerOptions);

    announcements.forEach(async (announcement) => {
      writer.appendRow(announcement);
    });

    await writer.close();
    const buffer = await this.bufferPublishStream(publishStream);
    const [cid, hash, size] = await this.pinParquetFileToIPFS(buffer);
    const ipfsUrl = await this.formIpfsUrl(cid);
    this.logger.debug(`Batch ${batchId} published to IPFS at ${ipfsUrl}`);
    this.logger.debug(`Batch ${batchId} hash: ${hash}`);
    return { id: batchId, schemaId, data: { cid, payloadLength: size } };
  }

  private async bufferPublishStream(publishStream: PassThrough): Promise<Buffer> {
    this.logger.debug('Buffering publish stream');
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      publishStream.on('data', (data) => {
        buffers.push(data);
      });
      publishStream.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      publishStream.on('error', (err) => {
        reject(err);
      });
    });
  }

  private async pinParquetFileToIPFS(buf: Buffer): Promise<[string, string, number]> {
    const { cid, hash, size } = await this.ipfsService.ipfsPin('application/octet-stream', buf);
    return [cid.toString(), hash, size];
  }

  private async formIpfsUrl(cid: string): Promise<string> {
    return this.configService.getIpfsCidPlaceholder(cid);
  }
}
