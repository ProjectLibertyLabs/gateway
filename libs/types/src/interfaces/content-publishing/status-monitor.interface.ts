import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { IPublisherJob } from './publisher-job.interface';

export interface ITxMonitorJob {
  id: string;
  txHash: Hash;
  lastFinalizedBlockHash: BlockHash;
  referencePublishJob: IPublisherJob;
}
