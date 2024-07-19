import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import Redis from 'ioredis';
import fs from 'fs';
import { createKeys } from '../../../../libs/common/src/blockchain/create-keys';
import { NUMBER_OF_NONCE_KEYS_TO_CHECK, NONCE_KEY_EXPIRE_SECONDS, getNonceKey } from '../../../../libs/common/src/utils/redis';
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
      numberOfKeys: NUMBER_OF_NONCE_KEYS_TO_CHECK,
      lua: fs.readFileSync('lua/incrementNonce.lua', 'utf8'),
    });
  }

  async onApplicationBootstrap() {
    this.accountId = createKeys(this.configService.providerAccountSeedPhrase).publicKey;
    const nextNonce = await this.getNextNonce();
    this.logger.log(`nonce is set to ${nextNonce}`);
  }

  async getNextNonce(): Promise<number> {
    const nonce = await this.blockchainService.getNonce(this.accountId);
    const keys = this.getNextPossibleKeys(nonce);
    // @ts-expect-error peekNonce is a custom command
    const nextNonceIndex = await this.redis.incrementNonce(...keys, keys.length, NONCE_KEY_EXPIRE_SECONDS);
    if (nextNonceIndex === -1) {
      this.logger.warn(`nextNonce was full even with ${NUMBER_OF_NONCE_KEYS_TO_CHECK} ${nonce}`);
      return Number(nonce) + NUMBER_OF_NONCE_KEYS_TO_CHECK;
    }
    const nextNonce = Number(nonce) + nextNonceIndex - 1;
    this.logger.debug(`nextNonce ${nextNonce}`);
    return nextNonce;
  }

  // eslint-disable-next-line class-methods-use-this
  getNextPossibleKeys(currentNonce: number): string[] {
    const keys: string[] = [];
    for (let i = 0; i < NUMBER_OF_NONCE_KEYS_TO_CHECK; i += 1) {
      const key = currentNonce + i;
      keys.push(getNonceKey(`${key}`));
    }
    return keys;
  }
}
