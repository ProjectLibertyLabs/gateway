import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { AccountUpdateJob } from './account.update.job';

export interface ITxMonitorJob {
  id: string;
  txHash: Hash;
  epoch: string;
  lastFinalizedBlockHash: BlockHash;
  referencePublishJob: AccountUpdateJob;
}
