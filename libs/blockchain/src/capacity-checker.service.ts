/*
 * NOTE: This class is designed to isolate consumers from having to deal with the details of interacting directly
 *       with the Frequency blockchain. To that end, return values of functions should not expose the SCALE-
 *       encoded objects that are directly returned from Frequency RPC calls; rather, all payloads should be
 *       unwrapped and re-formed using native Javascript types.
 *
 *       RPC methods that have the potential to return values wrapped as `Option<...>` or any value supporting
 *       the `.isEmpty`, `.isSome`, or `.isNone` getters should implement one of the following behaviors:
 *          - have a specified return type of `<type> | null` and return null for an empty value
 *          - return some sane default for an empty value
 *          - throw an error if an empty value is encountered
 */
import { ICapacityLimit } from '#types/interfaces/capacity-limit.interface';
import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ICapacityInfo } from './types';
import blockchainConfig, { IBlockchainConfig } from './blockchain.config';
import { BlockchainRpcQueryService } from './blockchain-rpc-query.service';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

export const CAPACITY_EXHAUSTED_EVENT = 'capacity.exhausted';
export const CAPACITY_AVAILABLE_EVENT = 'capacity.available';

const EPOCH_CAPACITY_PREFIX = 'epochCapacity:';
const CURRENT_CHAIN_CAPACITY_KEY = 'currentChainCapacity:';
const CAPACITY_CHECK_INTERVAL_MS = 10000; // 10 seconds

@Injectable()
export class CapacityCheckerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger: Logger;

  private lastCapacityEpoch: number;

  private lastCapacityUsedCheck: bigint;

  private capacityCheckInterval: NodeJS.Timeout;

  async onApplicationBootstrap() {
    await this.updateCachedCapacity();
  }

  onModuleDestroy() {
    if (this.capacityCheckInterval) {
      clearInterval(this.capacityCheckInterval);
    }
  }

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly blockchainService: BlockchainRpcQueryService,
    @Inject(blockchainConfig.KEY) private readonly config: IBlockchainConfig,
    @InjectRedis() private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger = pino(getBasicPinoOptions(this.constructor.name));

    // NOTE: Why we do this on an interval instead of using an expiring cache key & fetching inside checkForSufficientCapacity:
    // - We wanted to take the RPC call to the chain out of the critical path for checking capacity (and more specifically, out of the critical path for submitting transactions)
    this.capacityCheckInterval = setInterval(() => {
      this.updateCachedCapacity();
    }, CAPACITY_CHECK_INTERVAL_MS); // Check every 10 seconds
  }

  private async updateCachedCapacity() {
    try {
      const { providerId } = this.config;
      const capacityInfo = await this.blockchainService.capacityInfo(providerId);
      await this.redis.set(CURRENT_CHAIN_CAPACITY_KEY, JSON.stringify(capacityInfo));
    } catch (err: any) {
      this.logger.error('Caught error in updateCachedCapacity', err?.stack);
    }
  }

  private checkTotalCapacityLimit(capacityInfo: ICapacityInfo, totalLimit: ICapacityLimit): boolean {
    const { remainingCapacity, totalCapacityIssued } = capacityInfo;
    const totalCapacityUsed = totalCapacityIssued - remainingCapacity;
    let outOfCapacity = false;

    let limit = totalLimit.value;
    if (totalLimit.type === 'percentage') {
      limit = (totalCapacityIssued * totalLimit.value) / 100n;
    }
    outOfCapacity = totalCapacityUsed >= limit;

    if (outOfCapacity) {
      this.logger.warn(
        `Total capacity usage limit reached: used ${totalCapacityUsed} of ${limit} allowed (${totalCapacityIssued} total issued)`,
      );
    }

    return outOfCapacity;
  }

  private async checkServiceCapacityLimit(capacityInfo: ICapacityInfo, serviceLimit: ICapacityLimit): Promise<boolean> {
    const { remainingCapacity, totalCapacityIssued, currentEpoch } = capacityInfo;
    let limit = serviceLimit.value;
    if (serviceLimit.type === 'percentage') {
      limit = (totalCapacityIssued * serviceLimit.value) / 100n;
    }

    const epochCapacityKey = `${EPOCH_CAPACITY_PREFIX}${currentEpoch}`;
    const epochUsedCapacity = BigInt((await this.redis.get(epochCapacityKey)) ?? 0); // Fetch capacity used by the service

    const outOfCapacity = epochUsedCapacity >= limit;

    if (outOfCapacity) {
      this.logger.warn(`Capacity service threshold reached: used ${epochUsedCapacity} of ${limit}`);
    } else if (this.lastCapacityEpoch !== currentEpoch || this.lastCapacityUsedCheck !== epochUsedCapacity) {
      // Minimum with bigints
      const serviceRemaining =
        remainingCapacity > limit - epochUsedCapacity ? limit - epochUsedCapacity : remainingCapacity;
      this.logger.trace(
        `Service Capacity usage: ${epochUsedCapacity} of ${limit} allowed (${serviceRemaining} remaining)`,
      );
      this.lastCapacityEpoch = currentEpoch;
      this.lastCapacityUsedCheck = epochUsedCapacity;
    }

    return outOfCapacity;
  }

  /**
   * Checks remaining Capacity against configured per-service and total Capacity limits.
   *
   * @returns {boolean} Returns true if remaining Capacity is within allowed limits; false otherwise
   */
  public async checkForSufficientCapacity(): Promise<boolean> {
    let outOfCapacity = false;

    try {
      const { capacityLimit } = this.config;
      const capacityInfo = JSON.parse(await this.redis.get(CURRENT_CHAIN_CAPACITY_KEY), (key, value) => {
        if (key === 'remainingCapacity' || key === 'totalCapacityIssued') {
          return BigInt(value);
        }
        return value;
      }) as ICapacityInfo;

      // This doesn't really pick up on capacity exhaustion, as usage is unlikely to bring capacity to zero
      // (there will always be some dust). But it will warn in the case where a provider has been completely un-staked
      // (or they're using the wrong keypair in the config, one with no capacity, etc...)
      if (capacityInfo.remainingCapacity <= 0n) {
        this.logger.warn(`No capacity!`);
      }

      const totalLimitExceeded = capacityLimit.totalLimit
        ? this.checkTotalCapacityLimit(capacityInfo, capacityLimit.totalLimit)
        : false;
      const serviceLimitExceeded = await this.checkServiceCapacityLimit(capacityInfo, capacityLimit.serviceLimit);

      outOfCapacity = capacityInfo.remainingCapacity <= 0n || serviceLimitExceeded || totalLimitExceeded;

      if (outOfCapacity) {
        await this.eventEmitter.emitAsync(CAPACITY_EXHAUSTED_EVENT, capacityInfo);
      } else {
        await this.eventEmitter.emitAsync(CAPACITY_AVAILABLE_EVENT);
      }
    } catch (err: any) {
      this.logger.error('Caught error in checkCapacity', err?.stack);
    }

    return !outOfCapacity;
  }
}
