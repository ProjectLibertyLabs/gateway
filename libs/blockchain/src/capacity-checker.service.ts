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
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ICapacityInfo } from './types';
import { ConfigService } from '@nestjs/config';
import { IBlockchainConfig } from './blockchain.config';
import { BlockchainRpcQueryService } from './blockchain-rpc-query.service';

export const CAPACITY_EXHAUSTED_EVENT = 'capacity.exhausted';
export const CAPACITY_AVAILABLE_EVENT = 'capacity.available';

const EPOCH_CAPACITY_PREFIX = 'epochCapacity:';

@Injectable()
export class CapacityCheckerService {
  private readonly logger: Logger;

  private lastCapacityEpoch: number;

  private lastCapacityUsedCheck: bigint;

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly blockchainService: BlockchainRpcQueryService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
    // eslint-disable-next-line no-empty-function
  ) {
    this.logger = new Logger();
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
      this.logger.verbose(
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
      const { capacityLimit, providerId }: IBlockchainConfig = this.configService.get('blockchain');
      const capacityInfo = await this.blockchainService.capacityInfo(providerId);

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
