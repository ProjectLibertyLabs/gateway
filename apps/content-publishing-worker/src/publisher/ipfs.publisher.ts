import { Inject, Injectable, Logger } from '@nestjs/common';
import { KeyringPair } from '@polkadot/keyring/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { Hash } from '@polkadot/types/interfaces';
import { NonceService } from './nonce.service';
import { BlockchainService } from '#content-publishing-lib/blockchain/blockchain.service';
import { createKeys } from '#content-publishing-lib/blockchain/create-keys';
import { IPublisherJob } from '../interfaces';
import blockchainConfig, { IBlockchainConfig } from '#content-publishing-lib/blockchain/blockchain.config';

@Injectable()
export class IPFSPublisher {
  private logger: Logger;

  constructor(
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainService,
    private nonceService: NonceService,
  ) {
    this.logger = new Logger(IPFSPublisher.name);
  }

  public async publish(message: IPublisherJob): Promise<[Hash, SubmittableExtrinsic<'promise', ISubmittableResult>]> {
    this.logger.debug(JSON.stringify(message));
    const providerKeys = createKeys(this.blockchainConf.providerSeedPhrase);
    const tx = this.blockchainService.createExtrinsicCall(
      { pallet: 'messages', extrinsic: 'addIpfsMessage' },
      message.schemaId,
      message.data.cid,
      message.data.payloadLength,
    );
    return this.processSingleBatch(providerKeys, tx);
  }

  async processSingleBatch(
    providerKeys: KeyringPair,
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  ): Promise<[Hash, SubmittableExtrinsic<'promise', ISubmittableResult>]> {
    this.logger.debug(`Submitting tx of size ${tx.length}`);
    try {
      const ext = this.blockchainService.createExtrinsic(
        { pallet: 'frequencyTxPayment', extrinsic: 'payWithCapacity' },
        providerKeys,
        tx,
      );
      this.logger.debug('Submitted transaction: ', ext.getCall().toHex());
      const nonce = await this.nonceService.getNextNonce();
      const txHash = await ext.signAndSend(nonce);
      if (!txHash) {
        throw new Error('Tx hash is undefined');
      }
      this.logger.debug(`Tx hash: ${txHash}`);
      return [txHash, ext.extrinsic];
    } catch (e) {
      this.logger.error(`Error processing batch: ${e}`);
      throw e;
    }
  }
}
