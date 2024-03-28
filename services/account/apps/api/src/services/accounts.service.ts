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
  async createAccount(): Promise<string> {
    return 'Account created successfully';
  }

  async getAccount(msaId: string): Promise<AccountResponse> {
    const publicKeyCountForMsaId = await this.blockchainService.getPublicKeyCountForMsaId(msaId);
    if (publicKeyCountForMsaId !== '0') {
      const handle = await this.blockchainService.getHandleForMsa(msaId);
      return { msaId: msaId, handle };
    } else throw new Error('Invalid msaId.');
  }
}
