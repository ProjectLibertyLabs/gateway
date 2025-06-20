import { Inject, Injectable } from '@nestjs/common';
import { PassThrough } from 'node:stream';
import { ParquetWriter, ParquetSchema } from '@dsnp/parquetjs';
import { fromDSNPSchema } from '@dsnp/schemas/parquet';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { hexToString } from '@polkadot/util';
import { BlockchainService } from '#blockchain/blockchain.service';
import { IBatchAnnouncerJobData } from '../interfaces';
import ipfsConfig, { formIpfsUrl, IIpfsConfig } from '#storage/ipfs/ipfs.config';
import { IpfsService } from '#storage';
import { STORAGE_EXPIRE_UPPER_LIMIT_SECONDS } from '#types/constants';
import { IBatchFile, IPublisherJob } from '#types/interfaces/content-publishing';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

@Injectable()
export class BatchAnnouncer {
  private logger: Logger;

  constructor(
    @InjectRedis() private cacheManager: Redis,
    @Inject(ipfsConfig.KEY) private readonly config: IIpfsConfig,
    private blockchainService: BlockchainService,
    private ipfsService: IpfsService,
  ) {
    this.logger = pino(getBasicPinoOptions(BatchAnnouncer.name));
  }

  public async announce(batchJob: IBatchAnnouncerJobData): Promise<IPublisherJob> {
    this.logger.debug(`Announcing batch ${batchJob.batchId} on IPFS`);
    const { batchId, schemaId, announcements } = batchJob;

    const schemaCacheKey = `schema:${schemaId}`;
    let cachedSchema: string | null = await this.cacheManager.get(schemaCacheKey);
    if (!cachedSchema) {
      const schemaResponse = await this.blockchainService.getSchemaPayload(schemaId);
      if (!schemaResponse) {
        throw new Error(`Unable to retrieve schema for Schema ID ${schemaId}`);
      }
      cachedSchema = JSON.stringify(schemaResponse);
      await this.cacheManager.setex(schemaCacheKey, STORAGE_EXPIRE_UPPER_LIMIT_SECONDS, cachedSchema);
    }

    const frequencySchemaPayload = JSON.parse(cachedSchema);
    const hexString: string = Buffer.from(frequencySchemaPayload).toString('utf8');
    const schema = JSON.parse(hexToString(hexString));
    if (!schema) {
      throw new Error(`Unable to parse schema for schemaId ${schemaId}`);
    }

    const [parquetSchema, writerOptions] = fromDSNPSchema(schema);
    const publishStream = new PassThrough();
    const parquetBufferAwait = this.bufferPublishStream(publishStream);
    const writer = await ParquetWriter.openStream(
      new ParquetSchema(parquetSchema),
      publishStream as any,
      writerOptions,
    );
    // eslint-disable-next-line no-restricted-syntax
    for await (const announcement of announcements) {
      await writer.appendRow(announcement);
    }
    await writer.close();

    const buffer = await parquetBufferAwait;
    const [cid, hash, size] = await this.pinParquetFileToIPFS(buffer);
    const ipfsUrl = formIpfsUrl(cid, this.config);
    this.logger.debug(`Batch ${batchId} published to IPFS at ${ipfsUrl}`);
    this.logger.debug(`Batch ${batchId} hash: ${hash}`);
    return { id: batchId, schemaId, data: { cid, payloadLength: size } };
  }

  public async announceExistingBatch(batch: IBatchFile): Promise<IPublisherJob> {
    // Get previously uploaded file from IPFS
    this.logger.info(`Getting info from IPFS for ${batch.cid}`);
    try {
      const { cid, size } = await this.ipfsService.getInfoFromLocalNode(batch.cid);
      this.logger.debug(`Got info from IPFS: cid=${cid}, size=${size}`);

      const response = {
        id: batch.cid,
        schemaId: batch.schemaId,
        data: { cid: cid.toV1().toString(), payloadLength: size },
      };
      this.logger.debug(`Created job to announce existing batch: ${JSON.stringify(response)}`);
      return response;
    } catch (err: any) {
      throw new Error(`Unable to confirm batch file existence in IPFS: ${err.message}`);
    }
  }

  private async bufferPublishStream(publishStream: PassThrough): Promise<Buffer> {
    this.logger.debug('Buffering publish stream');
    return new Promise<Buffer>((resolve, reject) => {
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
}
