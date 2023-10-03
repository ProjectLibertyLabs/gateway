import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import Redis from 'ioredis';
import fs from 'fs';
import { createKeys } from '../../../../libs/common/src/blockchain/create-keys';
import { RedisUtils } from '../../../../libs/common/src/utils/redis';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { ConfigService } from '../../../../libs/common/src/config/config.service';

@Injectable()
export class NonceService implements OnApplicationBootstrap {
  private logger: Logger;

  private accountId: Uint8Array;

  constructor(
    @InjectRedis() private redis: Redis,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
  ) {
    this.logger = new Logger(NonceService.name);
    redis.defineCommand('incrementNonce', {
      numberOfKeys: 1,
      lua: fs.readFileSync('lua/incrementNonce.lua', 'utf8'),
    });
  }

  async onApplicationBootstrap() {
    this.accountId = createKeys(this.configService.getProviderAccountSeedPhrase()).publicKey;
    const nextNonce = await this.getNextNonce();
    this.logger.log(`nonce is set to ${nextNonce}`);
  }

  async getNextNonce(): Promise<number> {
    const nonce = await this.blockchainService.getNonce(this.accountId);
    // @ts-ignore
    const nextNonce = await this.redis.incrementNonce(RedisUtils.CHAIN_NONCE_KEY, nonce);
    this.logger.debug(`nextNonce ${nextNonce}`);
    return nextNonce;
  }
}
