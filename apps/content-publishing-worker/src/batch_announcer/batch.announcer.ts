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
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class BatchAnnouncer {
  constructor(
    @InjectRedis() private cacheManager: Redis,
    @Inject(ipfsConfig.KEY) private readonly config: IIpfsConfig,
    private blockchainService: BlockchainService,
    private ipfsService: IpfsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
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
    this.logger.debug(`Getting info from IPFS for ${batch.cid}`);
    try {
      // First check if the file exists in local gateway if not try to pin it
      let exists = await this.ipfsService.existsInLocalGateway(batch.cid);
      exists = await this.ipfsService.tryPin(batch.cid);

      if (!exists) {
        throw new Error('File does not exist in IPFS network');
      }

      // Try to get info and pin if needed
      try {
        const info = await this.ipfsService.getInfoFromLocalNode(batch.cid);
        this.logger.debug(`Got info from IPFS: cid=${info.cid}, size=${info.size}`);

        const response = {
          id: batch.cid,
          schemaId: batch.schemaId,
          data: { cid: info.cid.toV1().toString(), payloadLength: info.size },
        };
        this.logger.debug(`Created job to announce existing batch: ${JSON.stringify(response)}`);
        return response;
      } catch (_err) {
        // If we get here, the file exists but might need to be pinned
        await this.ipfsService.tryPin(batch.cid);
        const info = await this.ipfsService.getInfoFromLocalNode(batch.cid);

        const response = {
          id: batch.cid,
          schemaId: batch.schemaId,
          data: { cid: info.cid.toV1().toString(), payloadLength: info.size },
        };
        this.logger.debug(`Created job to announce existing batch after pinning: ${JSON.stringify(response)}`);
        return response;
      }
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
