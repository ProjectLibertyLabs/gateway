import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueConstants } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import type { AccountResponse } from '../../../../libs/common/src/types/dtos/accounts.dto';
import { ConfigService } from '../../../../libs/common/src/config/config.service';

@Injectable()
export class AccountsService {
  private readonly logger: Logger;

  constructor(
    @InjectRedis() private redis: Redis,
    @InjectQueue(QueueConstants.TRANSACTION_PUBLISH_QUEUE)
    private transactionPublishQueue: Queue,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  //   async enqueueRequest(request: CreateUserAccountRequest): Promise<AccountChangeRepsonseDto> {
  //     const providerId = this.configService.getProviderId();
  //     const data: ProviderGraphUpdateJob = {
  //       msaId: request.msaId,
  //       providerId,
  //       connections: request.connections.data,
  //       graphKeyPairs: request.graphKeyPairs,
  //       referenceId: this.calculateJobId(request),
  //       updateConnection: this.configService.getReconnectionServiceRequired(),
  //     };
  //     const jobOld = await this.accountChangePublishQueue.getJob(data.referenceId);
  //     if (jobOld && (await jobOld.isCompleted())) {
  //       await jobOld.remove();
  //     }
  //     const job = await this.accountChangePublishQueue.add(`Request Job - ${data.referenceId}`, data, { jobId: data.referenceId });
  //     this.logger.debug(job);
  //     return {
  //       referenceId: data.referenceId,
  //     };
  //   }

  async getAccount(msaId: number): Promise<AccountResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const handle = await this.blockchainService.getHandleForMsa(msaId);
      return { msaId, handle };
    }
    throw new Error('Invalid msaId.');
  }
}
