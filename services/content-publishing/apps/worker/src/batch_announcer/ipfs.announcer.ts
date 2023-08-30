import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '../../../api/src/config/config.service';
import { IBatchAnnouncerJobData } from '../interfaces/batch-announcer.job.interface';

@Injectable()
export class IPFSAnnouncer {
  private logger: Logger;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger = new Logger(IPFSAnnouncer.name);
  }

  public async announce(batchJob: IBatchAnnouncerJobData): Promise<void> {
    this.logger.log(`Announcing batch ${batchJob.batchId} on IPFS`);
  }
}
