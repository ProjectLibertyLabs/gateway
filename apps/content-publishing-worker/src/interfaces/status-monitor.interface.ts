import { IPublisherJob } from '#types/interfaces/content-publishing';
import { BlockHash, Hash } from '@polkadot/types/interfaces';

export interface ITxMonitorJob {
  id: string;
  txHash: Hash;
  lastFinalizedBlockHash: BlockHash;
  referencePublishJob: IPublisherJob;
}
