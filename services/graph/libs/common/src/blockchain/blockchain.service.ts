/* eslint-disable no-underscore-dangle */
import { Injectable, Logger, OnApplicationBootstrap, BeforeApplicationShutdown } from '@nestjs/common';
import { ApiPromise, HttpProvider, WsProvider } from '@polkadot/api';
import { options } from '@frequency-chain/api-augment';
import { KeyringPair } from '@polkadot/keyring/types';
import { BlockHash, BlockNumber, Hash, SignedBlock } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { AnyNumber, ISubmittableResult, RegistryError } from '@polkadot/types/types';
import { u32, Option } from '@polkadot/types';
import { PalletCapacityCapacityDetails, PalletCapacityEpochInfo } from '@polkadot/types/lookup';
import { ConfigService } from '../config/config.service';
import { Extrinsic } from './extrinsic';

interface ITxMonitorResult {
  found: boolean;
  success: boolean;
  blockHash?: BlockHash;
  capacityEpoch?: number;
  capacityWithDrawn?: bigint;
  error?: RegistryError;
}

@Injectable()
export class BlockchainService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  public api: ApiPromise;

  private configService: ConfigService;

  private logger: Logger;

  public async onApplicationBootstrap() {
    const providerUrl = this.configService.frequencyUrl!;
    let provider: any;
    if (/^ws/.test(providerUrl.toString())) {
      provider = new WsProvider(providerUrl.toString());
    } else if (/^http/.test(providerUrl.toString())) {
      provider = new HttpProvider(providerUrl.toString());
    } else {
      this.logger.error(`Unrecognized chain URL type: ${providerUrl.toString()}`);
      throw new Error('Unrecognized chain URL type');
    }
    this.api = await ApiPromise.create({ provider, ...options });
    await this.api.isReady;
    this.logger.log('Blockchain API ready.');
  }

  public async isReady(): Promise<boolean> {
    await this.api.isReady;
    return true;
  }

  public async beforeApplicationShutdown(_signal?: string | undefined) {
    await this.api?.disconnect();
  }

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.logger = new Logger(this.constructor.name);
  }

  public getBlockHash(block: BlockNumber | AnyNumber): Promise<BlockHash> {
    return this.api.rpc.chain.getBlockHash(block);
  }

  public getBlock(block: BlockHash): Promise<SignedBlock> {
    return this.api.rpc.chain.getBlock(block);
  }

  public async getLatestFinalizedBlockHash(): Promise<BlockHash> {
    return this.api.rpc.chain.getFinalizedHead();
  }

  public async getLatestFinalizedBlockNumber(): Promise<number> {
    const blockHash = await this.getLatestFinalizedBlockHash();
    return (await this.api.rpc.chain.getBlock(blockHash)).block.header.number.toNumber();
  }

  public async getBlockNumberForHash(hash: string): Promise<number | undefined> {
    const block = await this.api.rpc.chain.getBlock(hash);
    if (block) {
      return block.block.header.number.toNumber();
    }

    this.logger.error(`No block found corresponding to hash ${hash}`);
    return undefined;
  }

  public createType(type: string, ...args: (any | undefined)[]) {
    return this.api.registry.createType(type, ...args);
  }

  public createExtrinsicCall({ pallet, extrinsic }: { pallet: string; extrinsic: string }, ...args: (any | undefined)[]): SubmittableExtrinsic<'promise', ISubmittableResult> {
    return this.api.tx[pallet][extrinsic](...args);
  }

  public createExtrinsic(
    { pallet, extrinsic }: { pallet: string; extrinsic: string },
    { eventPallet, event }: { eventPallet?: string; event?: string },
    keys: KeyringPair,
    ...args: (any | undefined)[]
  ): Extrinsic {
    const targetEvent = eventPallet && event ? this.api.events[eventPallet][event] : undefined;
    return new Extrinsic(this.api, this.api.tx[pallet][extrinsic](...args), keys);
  }

  public rpc(pallet: string, rpc: string, ...args: (any | undefined)[]): Promise<any> {
    return this.api.rpc[pallet][rpc](...args);
  }

  public query(pallet: string, extrinsic: string, ...args: (any | undefined)[]): Promise<any> {
    return args ? this.api.query[pallet][extrinsic](...args) : this.api.query[pallet][extrinsic]();
  }

  public async queryAt(blockHash: BlockHash, pallet: string, extrinsic: string, ...args: (any | undefined)[]): Promise<any> {
    const newApi = await this.api.at(blockHash);
    return newApi.query[pallet][extrinsic](...args);
  }

  public async getNonce(account: Uint8Array): Promise<number> {
    return this.rpc('system', 'accountNextIndex', account);
  }

  public async capacityInfo(providerId: string): Promise<{
    providerId: string;
    currentBlockNumber: number;
    nextEpochStart: number;
    remainingCapacity: bigint;
    totalCapacityIssued: bigint;
    currentEpoch: number;
  }> {
    const providerU64 = this.api.createType('u64', providerId);
    const { epochStart }: PalletCapacityEpochInfo = await this.query('capacity', 'currentEpochInfo');
    const epochBlockLength: u32 = await this.query('capacity', 'epochLength');
    const capacityDetailsOption: Option<PalletCapacityCapacityDetails> = await this.query('capacity', 'capacityLedger', providerU64);
    const { remainingCapacity, totalCapacityIssued } = capacityDetailsOption.unwrapOr({ remainingCapacity: 0, totalCapacityIssued: 0 });
    const currentBlock: u32 = await this.query('system', 'number');
    const currentEpoch = await this.getCurrentCapacityEpoch();
    return {
      currentEpoch,
      providerId,
      currentBlockNumber: currentBlock.toNumber(),
      nextEpochStart: epochStart.add(epochBlockLength).toNumber(),
      remainingCapacity: typeof remainingCapacity === 'number' ? BigInt(remainingCapacity) : remainingCapacity.toBigInt(),
      totalCapacityIssued: typeof totalCapacityIssued === 'number' ? BigInt(totalCapacityIssued) : totalCapacityIssued.toBigInt(),
    };
  }

  public async getCurrentCapacityEpoch(): Promise<number> {
    const currentEpoch: u32 = await this.query('capacity', 'currentEpoch');
    return currentEpoch.toNumber();
  }

  public async getCurrentCapacityEpochStart(): Promise<number> {
    const currentEpochInfo: PalletCapacityEpochInfo = await this.query('capacity', 'currentEpochInfo');
    return currentEpochInfo.epochStart.toNumber();
  }

  public async getCurrentEpochLength(): Promise<number> {
    const epochLength: u32 = await this.query('capacity', 'epochLength');
    return epochLength.toNumber();
  }

  public async crawlBlockListForTx(txHash: Hash, blockList: bigint[], successEvents: [{ pallet: string; event: string }]): Promise<ITxMonitorResult> {
    const txReceiptPromises: Promise<ITxMonitorResult>[] = blockList.map(async (blockNumber) => {
      const blockHash = await this.getBlockHash(blockNumber);
      const block = await this.getBlock(blockHash);
      const txIndex = block.block.extrinsics.findIndex((extrinsic) => extrinsic.hash.toString() === txHash.toString());

      if (txIndex === -1) {
        return { found: false, success: false };
      }

      this.logger.verbose(`Found tx ${txHash} in block ${blockNumber}`);
      const at = await this.api.at(blockHash.toHex());
      const capacityEpoch = (await at.query.capacity.currentEpoch()).toNumber();
      const eventsPromise = at.query.system.events();

      let isTxSuccess = false;
      let totalBlockCapacity = 0n;
      let txError: RegistryError | undefined;

      try {
        const events = (await eventsPromise).filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(txIndex));

        events.forEach((record) => {
          const { event } = record;
          const eventName = event.section;
          const { method } = event;
          const { data } = event;
          this.logger.debug(`Received event: ${eventName} ${method} ${data}`);

          // find capacity withdrawn event
          if (at.events.capacity.CapacityWithdrawn.is(event)) {
            totalBlockCapacity += event.data.amount.toBigInt();
          }

          // check custom success events
          if (successEvents.find((successEvent) => successEvent.pallet === eventName && successEvent.event === method)) {
            this.logger.debug(`Found success event ${eventName} ${method}`);
            isTxSuccess = true;
          }

          // check for system extrinsic failure
          if (at.events.system.ExtrinsicFailed.is(event)) {
            const { dispatchError } = event.data;
            const moduleThatErrored = dispatchError.asModule;
            const moduleError = dispatchError.registry.findMetaError(moduleThatErrored);
            txError = moduleError;
            this.logger.error(`Extrinsic failed with error: ${JSON.stringify(moduleError)}`);
          }
        });
      } catch (error) {
        this.logger.error(error);
      }
      this.logger.debug(`Total capacity withdrawn in block: ${totalBlockCapacity.toString()}`);
      return { found: true, success: isTxSuccess, blockHash, capacityEpoch, capacityWithDrawn: totalBlockCapacity, error: txError };
    });
    const results = await Promise.all(txReceiptPromises);
    const result = results.find((receipt) => receipt.found);
    this.logger.debug(`Found tx receipt: ${JSON.stringify(result)}`);
    return result ?? { found: false, success: false };
  }
}
