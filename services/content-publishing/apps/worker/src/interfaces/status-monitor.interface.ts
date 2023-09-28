import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { IPublisherJob } from './publisher-job.interface';

export interface ITxMonitorJob {
  id: string;
  txHash: Hash;
  epoch: string;
  lastFinalizedBlockHash: BlockHash;
  referencePublishJob: IPublisherJob;
}
