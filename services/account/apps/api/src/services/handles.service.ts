import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { QueueConstants } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { AccountResponse } from '../../../../libs/common/src/dtos/accounts.dto';
import { HandlesResponse } from '../../../../libs/common/src/dtos/handles.dtos';

@Injectable()
export class HandlesService {
  constructor(private blockchainService: BlockchainService) {}

  createHandle(handle: string): string {
    return 'Handle created successfully: ' + handle;
  }

  async getHandle(msaId: number): Promise<HandlesResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const handle = await this.blockchainService.getHandleForMsa(msaId);
      if (handle) {
        return { msaId, handle };
      } else {
        throw new Error('Handle not found.');
      }
    } else throw new Error('Invalid msaId.');
  }
}
