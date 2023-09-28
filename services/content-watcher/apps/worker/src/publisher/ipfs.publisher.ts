import { Injectable, Logger } from '@nestjs/common';
import { KeyringPair } from '@polkadot/keyring/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { Hash } from '@polkadot/types/interfaces';
import { BlockchainService } from '../../../../libs/common/src/blockchain/blockchain.service';
import { ConfigService } from '../../../../libs/common/src/config/config.service';
import { IPublisherJob } from '../interfaces/publisher-job.interface';
import { createKeys } from '../../../../libs/common/src/blockchain/create-keys';

@Injectable()
export class IPFSPublisher {
  private logger: Logger;

  constructor(
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(IPFSPublisher.name);
  }

  public async publish(message: IPublisherJob): Promise<Hash> {
    this.logger.debug(JSON.stringify(message));
    const providerKeys = createKeys(this.configService.getProviderAccountSeedPhrase());
    const tx = this.blockchainService.createExtrinsicCall({ pallet: 'messages', extrinsic: 'addIpfsMessage' }, message.schemaId, message.data.cid, message.data.payloadLength);
    return this.processSingleBatch(providerKeys, tx);
  }

  async processSingleBatch(providerKeys: KeyringPair, tx: SubmittableExtrinsic<'rxjs', ISubmittableResult>): Promise<Hash> {
    this.logger.debug(`Submitting tx of size ${tx.length}`);
    try {
      const ext = await this.blockchainService.createExtrinsic(
        { pallet: 'frequencyTxPayment', extrinsic: 'payWithCapacity' },
        { eventPallet: 'messages', event: 'MessagesStored' },
        providerKeys,
        tx,
      );
      const [txHash] = await ext.signAndSend();
      if (!txHash) {
        throw new Error('Tx hash is undefined');
      }
      this.logger.debug(`Tx hash: ${txHash}`);
      return txHash;
    } catch (e) {
      this.logger.error(`Error processing batch: ${e}`);
      throw e;
    }
  }
}
