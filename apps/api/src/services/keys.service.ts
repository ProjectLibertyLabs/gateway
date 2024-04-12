import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { QueueConstants } from '../../../../libs/common/src';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { AccountResponse } from '../../../../libs/common/src/dtos/accounts.dto';
import { KeysResponse } from '../../../../libs/common/src/types/dtos/keys.dto';

@Injectable()
export class KeysService {
  constructor(private blockchainService: BlockchainService) {}

  createKeys(): string {
    return 'Keys created successfully: ';
  }

  async getKeys(msaId: number): Promise<KeysResponse> {
    const isValidMsaId = await this.blockchainService.isValidMsaId(msaId);
    if (isValidMsaId) {
      const keys = await this.blockchainService.getKeysForMsa(msaId);
      if (keys) return keys;
      throw new Error('Handle not found.');
    } else {
      throw new Error('Invalid msaId.');
    }
  }
}
