import { InjectQueue } from '@nestjs/bullmq';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
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
  isImage,
  UploadResponseDto,
  OnChainContentDto,
  isParquet,
  BatchFileDto,
} from '#types/dtos/content-publishing';
import { IRequestJob, IAssetMetadata, IAssetJob, IPublisherJob } from '#types/interfaces/content-publishing';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';
import { calculateIpfsCID } from '#utils/common/common.utils';
import {
  ContentPublisherRedisConstants,
  STORAGE_EXPIRE_UPPER_LIMIT_SECONDS,
} from '#types/constants/redis-keys.constants';
import { AnnouncementTypeName, AttachmentType } from '#types/enums';
import getAssetMetadataKey = ContentPublisherRedisConstants.getAssetMetadataKey;
import getAssetDataKey = ContentPublisherRedisConstants.getAssetDataKey;

@Injectable()
export class ApiService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.REQUEST_QUEUE_NAME) private requestQueue: Queue,
    @InjectQueue(QueueConstants.ASSET_QUEUE_NAME) private assetQueue: Queue,
    @InjectQueue(QueueConstants.PUBLISH_QUEUE_NAME) private publishQueue: Queue,
    @InjectQueue(QueueConstants.BATCH_QUEUE_NAME) private readonly batchAnnouncerQueue: Queue,
  ) {
    this.logger = new Logger(this.constructor.name);
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
    }); // TODO: should come from queue configs
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
    }); // TODO: should come from queue configs
    this.logger.debug(`Enqueued Batch Request Job: ${job.id}`);
    return { referenceId: data.id };
  }

  async validateAssetsAndFetchMetadata(
    content: AssetIncludedRequestDto,
  ): Promise<IRequestJob['assetToMimeType'] | undefined> {
    const checkingList: { onlyImage: boolean; referenceId: string }[] = [];
    if (content.profile) {
      content.profile.icon?.forEach((reference) =>
        checkingList.push({ onlyImage: true, referenceId: reference.referenceId }),
      );
    } else if (content.content) {
      content.content.assets?.forEach((asset) =>
        asset.references?.forEach((reference) =>
          checkingList.push({
            onlyImage: false,
            referenceId: reference.referenceId,
          }),
        ),
      );
    } else if (content.batchFiles) {
      content.batchFiles.forEach((batchFile) => checkingList.push({ onlyImage: false, referenceId: batchFile.cid }));
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

        // checks if attached asset is an image
        if (checkingList[index].onlyImage && !isImage(metadata.mimeType)) {
          errors.push(`profile.icon.referenceId ${checkingList[index].referenceId} is not an image!`);
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
    const references = await Promise.all(referencePromises);

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
    this.checkTransactionResult(dataOps);
    const queuedJobs = await this.assetQueue.addBulk(jobs);
    this.logger.debug('Add Assets Job: ', queuedJobs);
    const metaDataOps = await metadataTransaction.exec();
    this.checkTransactionResult(metaDataOps);

    return {
      assetIds: references,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  private calculateJobId(jobWithoutId: unknown): string {
    const stringVal = JSON.stringify(jobWithoutId);
    return createHash('sha1').update(stringVal).digest('base64url');
  }

  private checkTransactionResult(result: [error: Error | null, result: unknown][] | null) {
    this.logger.log('Check Transaction Result: ', result);
    for (let index = 0; result && index < result.length; index += 1) {
      const [err, _id] = result[index];
      if (err) {
        throw err;
      }
    }
  }
}
