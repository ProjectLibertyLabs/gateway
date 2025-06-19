import { options } from '@frequency-chain/api-augment';
import { OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsProvider, ApiPromise, HttpProvider } from '@polkadot/api';
import { ApiDecoration, ApiInterfaceEvents } from '@polkadot/api/types';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { MILLISECONDS_PER_SECOND } from 'time-constants';
import { IBlockchainNonProviderConfig } from './blockchain.config';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

export class PolkadotApiService extends EventEmitter2 implements OnApplicationShutdown {
  private provider: ProviderInterface;

  protected readonly api: ApiPromise;

  protected readonly logger: Logger;

  // eslint-disable-next-line no-undef
  private disconnectedTimeout: NodeJS.Timeout | undefined;

  private apiListeners: [ApiInterfaceEvents, () => void][] = [];

  private baseReadyResolve: (arg: boolean) => void;

  private baseReadyReject: (reason: any) => void;

  protected readonly baseIsReadyPromise = new Promise<boolean>((resolve, reject) => {
    this.baseReadyResolve = resolve;
    this.baseReadyReject = reject;
  });

  public async onApplicationShutdown(_signal?: string | undefined) {
    this.apiListeners.forEach(([type, listener]) => this.api.off(type, listener));

    const promises: Promise<unknown>[] = [];
    if (this.api) {
      promises.push(this.api.disconnect());
    }

    if (this.provider) {
      promises.push(this.provider.disconnect());
    }
    await Promise.allSettled(promises);
  }

  constructor(
    private readonly baseConfig: IBlockchainNonProviderConfig,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
    this.logger = pino(getBasicPinoOptions(this.constructor.name));

    try {
      const providerUrl = this.baseConfig.frequencyApiWsUrl;
      if (/^ws[s]?:/.test(providerUrl.toString())) {
        this.provider = new WsProvider(this.baseConfig.frequencyApiWsUrl.toString());
      } else if (/^http[s]?:/.test(providerUrl.toString())) {
        this.provider = new HttpProvider(this.baseConfig.frequencyApiWsUrl.toString());
      } else {
        throw new Error('Unrecognized chain URL type', { cause: providerUrl.toJSON() });
      }

      this.api = new ApiPromise({ ...options, provider: this.provider, noInitWarn: false });
      // From https://github.com/polkadot-js/api/blob/700812aa6075c85d8306451ce062d8c06b161e2b/packages/api/src/promise/Api.ts#L157C1-L159C1
      // Swallow any rejections on isReadyOrError
      // (in Node 15.x this creates issues, when not being looked at)
      this.api.isReadyOrError.catch(() => {});
      this.registerApiListener('disconnected', () => this.startDisconnectedTimeout());
      this.registerApiListener('error', () => this.startDisconnectedTimeout());
      this.registerApiListener('connected', () => this.stopDisconnectedTimeout());
      this.registerApiListenerOnce('connected', () => {
        this.api.isReady.then(() => this.baseReadyResolve(true));
      });
      this.startDisconnectedTimeout(true);
    } catch (err: any) {
      this.logger.error({ err, msg: err?.message });
      this.baseReadyReject(err);
    }
  }

  public registerApiListener(type: ApiInterfaceEvents, listener: () => void) {
    this.apiListeners.push([type, listener]);
    this.api.on(type, listener);
  }

  public registerApiListenerOnce(type: ApiInterfaceEvents, listener: () => void) {
    this.apiListeners.push([type, listener]);
    this.wrapOnce(type, listener);
  }

  private wrapOnce(event: ApiInterfaceEvents, listener: () => void) {
    this.api.once(event, () => {
      const entry = this.apiListeners.findIndex((l) => l[0] === event && l[1] === listener);
      if (entry !== -1) {
        this.apiListeners.splice(entry, 1);
      }
      listener();
    });
  }

  public async getApi(blockHash?: Uint8Array | string): Promise<ApiDecoration<'promise'> | ApiPromise> {
    await this.api.isReady;
    return blockHash ? this.api.at(blockHash) : this.api;
  }

  public get chainPrefix(): number {
    return this.api.consts.system.ss58Prefix.toBn().toNumber();
  }

  /**
   * Gets block time ms from the chain metadata
   * From: https://github.com/polkadot-js/api/blob/a5c5f76aee54622d004c6b4342040e8c9d149d1e/packages/api-derive/src/tx/signingInfo.ts#L77
   */
  public get blockTimeMs(): number {
    return (
      this.api.consts.babe?.expectedBlockTime?.toNumber() ||
      this.api.consts.aura?.slotDuration?.toNumber() ||
      this.api.consts.timestamp?.minimumPeriod?.muln(2).toNumber() || // timestamp minimum period is half the block time
      6000 // fallback to a sane default of 6s (ie, metadata hasn't been fetched yet)
    );
  }

  public async isReady(): Promise<boolean> {
    return (await this.baseIsReadyPromise) && !!(await this.api.isReady);
  }

  private startDisconnectedTimeout(isInit = false) {
    if (!this.disconnectedTimeout) {
      this.logger[isInit ? 'log' : 'error'](
        isInit
          ? 'Awaiting Frequency RPC node connection'
          : `Communications error with Frequency node; starting ${this.baseConfig.frequencyTimeoutSecs}-second shutdown timer`,
      );
      this.disconnectedTimeout = setTimeout(() => {
        this.logger.error('Failed to reconnect to Frequency node; terminating application');
        this.eventEmitter.emit('shutdown');
      }, this.baseConfig.frequencyTimeoutSecs * MILLISECONDS_PER_SECOND);
      this.emit('chain.disconnected');
    }
  }

  private stopDisconnectedTimeout() {
    if (this.disconnectedTimeout) {
      this.logger.info('Connected to Frequency');
      clearTimeout(this.disconnectedTimeout);
      this.disconnectedTimeout = undefined;
      this.emit('chain.connected');
    }
  }
}
