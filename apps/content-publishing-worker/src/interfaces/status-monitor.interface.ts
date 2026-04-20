import { IPublisherJob,IBaseTxStatus} from '#types/interfaces';
import { BlockHash, Hash } from '@polkadot/types/interfaces';

export interface ITxMonitorJob {
  id: string;
  txHash: Hash;
  lastFinalizedBlockHash: BlockHash;
  referencePublishJob: IPublisherJob;
}

export interface IContentTxStatus extends IBaseTxStatus {
  referencePublishJob: IPublisherJob;
}
