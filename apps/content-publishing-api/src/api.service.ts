import { InjectQueue } from '@nestjs/bullmq';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { BulkJobOptions } from 'bullmq/dist/esm/interfaces';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';
import {
  RequestTypeDto,
  AnnouncementResponseDto,
  AssetIncludedRequestDto,
  UploadResponseDto,
  OnChainContentDto,
  BatchFileDto,
} from '#types/dtos/content-publishing';
import {
  VALID_UPLOAD_MIME_TYPES_REGEX,
  isImage,
  isParquet,
  DSNP_VALID_IMAGE_MIME_TYPES_REGEX,
  DSNP_VALID_MIME_TYPES_REGEX,
  VALID_BATCH_MIME_TYPES_REGEX,
} from '#validation';
import {
  IRequestJob,
  IAssetMetadata,
  IAssetJob,
  IPublisherJob,
  IFileResponse,
} from '#types/interfaces/content-publishing';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';
import {
  calculateDsnpMultiHash,
  calculateIncrementalDsnpMultiHash,
  calculateIpfsCID,
} from '#utils/common/common.utils';
import {
  ContentPublisherRedisConstants,
  STORAGE_EXPIRE_UPPER_LIMIT_SECONDS,
} from '#types/constants/redis-keys.constants';
import { AnnouncementTypeName, AttachmentType } from '#types/enums';
import getAssetMetadataKey = ContentPublisherRedisConstants.getAssetMetadataKey;
import getAssetDataKey = ContentPublisherRedisConstants.getAssetDataKey;
import { PassThrough, Readable } from 'stream';
import { FilePin, IpfsService } from '#storage';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class ApiService {
  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue,
    @InjectQueue(QueueConstants.ASSET_QUEUE_NAME) private assetQueue: Queue,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    @InjectQueue(QueueConstants.BATCH_QUEUE_NAME) private readonly batchAnnouncerQueue: Queue,
    private readonly ipfs: IpfsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async enqueueContent(msaId: string | undefined, content: OnChainContentDto): Promise<AnnouncementResponseDto> {
    const { schemaId, ...data } = content;
    const jobData: IPublisherJob = {
      id: '',
      schemaId,
      data: { ...data, onBehalfOf: msaId },
    };
    jobData.id = this.calculateJobId(jobData);
    const job = await this.publishQueue.add(`OnChain content job - ${jobData.id}`, jobData, {
      jobId: jobData.id,
      removeOnComplete: 1000,
      attempts: 3,
    });
    this.logger.debug(`Enqueued on-chain content job: ${job.id}`);
    return {
      referenceId: jobData.id,
    };
  }

  async enqueueRequest(
    announcementType: AnnouncementTypeName,
    msaId: string,
    content: RequestTypeDto,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<AnnouncementResponseDto> {
    const data = {
      content,
      id: '',
      announcementType,
      msaId,
      dependencyAttempt: 0,
    } as IRequestJob;
    data.id = this.calculateJobId(data);
    if (assetToMimeType) {
      // not used in id calculation since the order in map might not be deterministic
      data.assetToMimeType = assetToMimeType;
    }
    const job = await this.requestQueue.add(`Request Job - ${data.id}`, data, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    }); // Issue #940
    this.logger.debug(`Enqueued Request Job: ${job.id}`);
    return {
      referenceId: data.id,
    };
  }

  public async enqueueBatchRequest(batchFile: BatchFileDto): Promise<AnnouncementResponseDto> {
    const data = {
      id: '',
      ...batchFile,
    };
    data.id = this.calculateJobId(data);
    const job = await this.batchAnnouncerQueue.add(`Batch Request Job - ${data.id}`, data, {
      jobId: data.id,
      attempts: 3,
      delay: 3000,
      removeOnFail: false,
      removeOnComplete: 2000,
    }); // Issue #940
    this.logger.debug(`Enqueued Batch Request Job: ${job.id}`);
    return { referenceId: data.id };
  }

  async validateAssetsAndFetchMetadata(
    content: AssetIncludedRequestDto,
  ): Promise<IRequestJob['assetToMimeType'] | undefined> {
    const checkingList: { allowedMimeTypesRegex: RegExp; referenceId: string }[] = [];
    if (content.profile) {
      content.profile.icon?.forEach((reference) =>
        checkingList.push({
          allowedMimeTypesRegex: DSNP_VALID_IMAGE_MIME_TYPES_REGEX,
          referenceId: reference.referenceId,
        }),
      );
    } else if (content.content) {
      content.content.assets?.forEach((asset) =>
        asset.references?.forEach((reference) =>
          checkingList.push({
            allowedMimeTypesRegex: DSNP_VALID_MIME_TYPES_REGEX,
            referenceId: reference.referenceId,
          }),
        ),
      );
    } else if (content.batchFiles) {
      content.batchFiles.forEach((batchFile) =>
        checkingList.push({ allowedMimeTypesRegex: VALID_BATCH_MIME_TYPES_REGEX, referenceId: batchFile.cid }),
      );
    }

    const redisResults = await Promise.all(
      checkingList.map((obj) => this.redis.get(getAssetMetadataKey(obj.referenceId))),
    );
    const errors: string[] = [];
    const map = new Map();
    redisResults.forEach((res, index) => {
      if (res === null) {
        errors.push(
          `${content.profile ? 'profile.icon' : 'content.assets'}.referenceId ${checkingList[index].referenceId} does not exist!`,
        );
      } else {
        const metadata: IAssetMetadata = JSON.parse(res);
        map[checkingList[index].referenceId] = { mimeType: metadata.mimeType, attachmentType: metadata.type };

        // checks that the MIME type is allowed for this type of asset
        if (!checkingList[index].allowedMimeTypesRegex.test(metadata.mimeType)) {
          errors.push(
            `Uploaded asset referenceId ${checkingList[index].referenceId} has invalid MIME type ${metadata.mimeType}!`,
          );
        }
      }
    });
    if (errors.length > 0) {
      throw new HttpErrorByCode[HttpStatus.BAD_REQUEST](errors);
    }
    return map;
  }

  // eslint-disable-next-line no-undef
  async addAssets(files: Express.Multer.File[]): Promise<UploadResponseDto> {
    // calculate ipfs cid references
    const referencePromises: Promise<string>[] = files.map((file) => calculateIpfsCID(file.buffer));
    const hashPromises: Promise<string>[] = files.map((file) => calculateDsnpMultiHash(file.buffer));
    const references = await Promise.all(referencePromises);
    const dsnpHashes = await Promise.all(hashPromises);

    let dataTransaction = this.redis.multi();
    let metadataTransaction = this.redis.multi();
    const jobs: any[] = [];
    files.forEach((f, index) => {
      // adding data and metadata to the transaction
      dataTransaction = dataTransaction.setex(
        getAssetDataKey(references[index]),
        STORAGE_EXPIRE_UPPER_LIMIT_SECONDS,
        f.buffer,
      );

      let type: AttachmentType;
      this.logger.debug(`File mime type is: ${f.mimetype}`);
      if (isParquet(f.mimetype)) {
        type = AttachmentType.PARQUET;
      } else {
        type = ((m) => {
          switch (m) {
            case 'image':
              return AttachmentType.IMAGE;
            case 'audio':
              return AttachmentType.AUDIO;
            case 'video':
              return AttachmentType.VIDEO;
            default:
              throw new Error('Invalid MIME type');
          }
        })(f.mimetype.split('/')[0]);
      }

      const assetCache: IAssetMetadata = {
        ipfsCid: references[index],
        dsnpMultiHash: dsnpHashes[index],
        mimeType: f.mimetype,
        createdOn: Date.now(),
        type,
      };

      metadataTransaction = metadataTransaction.setex(
        getAssetMetadataKey(references[index]),
        STORAGE_EXPIRE_UPPER_LIMIT_SECONDS,
        JSON.stringify(assetCache),
      );

      // adding asset job to the jobs
      jobs.push({
        name: `Asset Job - ${references[index]}`,
        data: {
          ipfsCid: references[index],
          contentLocation: getAssetDataKey(references[index]),
          metadataLocation: getAssetMetadataKey(references[index]),
          mimeType: f.mimetype,
        } as IAssetJob,
        opts: {
          jobId: references[index],
          removeOnFail: false,
          removeOnComplete: true,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        } as BulkJobOptions,
      });
    });

    // currently we are applying 3 different transactions on redis
    // 1: Storing the content data
    // 2: Adding asset jobs
    // 3: Storing the content metadata
    // even though all these transactions are applied separately, the overall behavior will clean up any partial failures eventually
    // partial failure scenarios:
    //    1: adding jobs failure: at this point we already successfully stored the data content in redis, but since all
    //       of this stored data has expire-time, it would eventually get cleaned up
    //    2: metadata transaction failure: at this point we already stored the data content and jobs and those two are
    //       enough to process the asset on the worker side, the worker will clean up both of them after processing
    const dataOps = await dataTransaction.exec();
    ApiService.checkTransactionResult(dataOps);
    const queuedJobs = await this.assetQueue.addBulk(jobs);
    this.logger.debug(queuedJobs, 'Add Assets Job');
    const metaDataOps = await metadataTransaction.exec();
    ApiService.checkTransactionResult(metaDataOps);

    return {
      assetIds: references,
    };
  }

  public async uploadStreamedAsset(
    stream: Readable,
    filename: string,
    mimetype: string,
    allowedMimeTypes = VALID_UPLOAD_MIME_TYPES_REGEX,
  ): Promise<IFileResponse> {
    this.logger.debug(`Processing file: ${filename} (${mimetype})`);

    if (!allowedMimeTypes.test(mimetype)) {
      this.logger.warn(`Skipping file: ${filename} due to unsupported file type (${mimetype}).`);
      stream.resume(); // Make sure we consume the entire file stream so the rest of the request can be processed
      return { error: `Unsupported file type (${mimetype})` };
    }

    let errored = false;

    // Create pipes to process IPFS upload & DSNP multihash calculation in parallel
    const uploadPassThru = new PassThrough();
    const hashPassThru = new PassThrough();

    // Stream error handler to make sure cleanup occurs on any stream error--
    // but only ONCE
    const handleError = (err: any) => {
      if (errored) return;
      errored = true;

      this.logger.error(err, '❌ Stream error:');

      // Try to destroy everything cleanly
      [uploadPassThru, hashPassThru].forEach((s) => {
        if (!s.destroyed) {
          // If still readable, resume so request doesn’t hang
          if (!s.readableEnded && !s.readableFlowing) {
            s.removeAllListeners('readable');
            s.resume();
          }

          // Then destroy (safe even if already ended)
          s.destroy(err);
        }
      });

      // Important: only destroy original stream after dependents
      if (!stream.destroyed) {
        stream.destroy(err);
      }
    };

    stream.on('error', handleError);
    uploadPassThru.on('error', handleError);
    hashPassThru.on('error', handleError);

    // Enable more logging
    uploadPassThru.on('close', () => this.logger.trace('uploadPassThru CLOSED'));
    uploadPassThru.on('end', () => this.logger.trace('uploadPassThru END'));

    stream.pipe(uploadPassThru);
    stream.pipe(hashPassThru);

    let uploadResult: FilePin;
    let dsnpMultiHash: string;

    try {
      [uploadResult, dsnpMultiHash] = await Promise.all([
        this.ipfs.ipfsPinStream(uploadPassThru),
        calculateIncrementalDsnpMultiHash(hashPassThru),
      ]);

      this.logger.info(`Uploaded file ${filename} to IPFS with CID: ${uploadResult.cid}`);
    } catch (error: any) {
      this.logger.error(`❌ Upload/hash promise error:, ${error.message}`);
      handleError(error);
      return { error: error?.message || `Error uploading or hashing file ${filename}` };
    }

    try {
      // Cache asset meta-info
      let type: AttachmentType;
      if (isParquet(mimetype)) {
        type = AttachmentType.PARQUET;
      } else {
        type = ((m) => {
          switch (m) {
            case 'image':
              return AttachmentType.IMAGE;
            case 'audio':
              return AttachmentType.AUDIO;
            case 'video':
              return AttachmentType.VIDEO;
            default:
              throw new Error('Invalid MIME type');
          }
        })(mimetype.split('/')[0]);
      }

      const assetCache: IAssetMetadata = {
        ipfsCid: uploadResult.cid,
        dsnpMultiHash,
        mimeType: mimetype,
        createdOn: Date.now(),
        type,
      };

      await this.redis.setex(
        getAssetMetadataKey(uploadResult.cid),
        STORAGE_EXPIRE_UPPER_LIMIT_SECONDS,
        JSON.stringify(assetCache),
      );
    } catch (error: any) {
      // If there was an error caching the metadata, it's okay--we'll just have to retrieve the file again later to compute the hash
      this.logger.warn(`Unexpected error caching asset metadata for ${filename} (${uploadResult.cid})`);
    }
    return { cid: uploadResult.cid };
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: unknown): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  private static checkTransactionResult(result: [error: Error | null, result: unknown][] | null) {
    for (let index = 0; result && index < result.length; index += 1) {
      const [err, _id] = result[index];
      if (err) {
        throw err;
      }
    }
  }
}
