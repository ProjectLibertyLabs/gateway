import { InjectRedis } from '@songkeys/nestjs-redis';
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import Redis from 'ioredis';
import fs from 'fs';
import { createKeys } from '../blockchain/create-keys';
import * as RedisUtils from '../utils/redis';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '../config/config.service';
import blockchainConfig from '#graph-lib/blockchain/blockchain.config';
import { IBlockchainConfig } from '#graph-lib/blockchain/IBlockchainConfig';

export const NONCE_SERVICE_REDIS_NAMESPACE = 'NonceService';

@Injectable()
export class NonceService implements OnApplicationBootstrap {
  private logger: Logger;

  private accountId: Uint8Array;

  constructor(
    @InjectRedis(NONCE_SERVICE_REDIS_NAMESPACE) private redis: Redis,
    private blockchainService: BlockchainService,
    @Inject(blockchainConfig.KEY) private readonly config: IBlockchainConfig,
  ) {
    this.logger = new Logger(NonceService.name);
    redis.defineCommand('incrementNonce', {
      numberOfKeys: RedisUtils.NUMBER_OF_NONCE_KEYS_TO_CHECK,
      lua: fs.readFileSync('lua/incrementNonce.lua', 'utf8'),
    });
  }

  async onApplicationBootstrap() {
    this.accountId = createKeys(this.config.providerSeedPhrase).publicKey;
    const nextNonce = await this.getNextNonce();
    this.logger.log(`nonce is set to ${nextNonce}`);
  }

  async getNextNonce(): Promise<number> {
    const nonce = await this.blockchainService.getNonce(this.accountId);
    const keys = this.getNextPossibleKeys(nonce);
    // @ts-expect-error incrementNonce is defined in the constructor
    const nextNonceIndex = await this.redis.incrementNonce(...keys, keys.length, RedisUtils.NONCE_KEY_EXPIRE_SECONDS);
    if (nextNonceIndex === -1) {
      this.logger.warn(`nextNonce was full even with ${RedisUtils.NUMBER_OF_NONCE_KEYS_TO_CHECK} ${nonce}`);
      return Number(nonce) + RedisUtils.NUMBER_OF_NONCE_KEYS_TO_CHECK;
    }
    const nextNonce = Number(nonce) + nextNonceIndex - 1;
    this.logger.debug(`nextNonce ${nextNonce}`);
    return nextNonce;
  }

  // eslint-disable-next-line class-methods-use-this
  getNextPossibleKeys(currentNonce: number): string[] {
    const keys: string[] = [];
    for (let i = 0; i < RedisUtils.NUMBER_OF_NONCE_KEYS_TO_CHECK; i += 1) {
      const key = currentNonce + i;
      keys.push(RedisUtils.getNonceKey(`${key}`));
    }
    return keys;
  }
}
