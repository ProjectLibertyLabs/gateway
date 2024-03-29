import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { QueueConstants } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { AccountResponse } from '../../../../libs/common/src/dtos/accounts.dto';

@Injectable()
export class AccountsService {
  constructor(private blockchainService: BlockchainService) {}

  // eslint-disable-next-line class-methods-use-this
  createAccount(): string {
    return 'Account created successfully';
  }

  async getAccount(msaId: number): Promise<AccountResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const handle = await this.blockchainService.getHandleForMsa(msaId);
      return { msaId: msaId.toString(), handle };
    } else throw new Error('Invalid msaId.');
  }
}
