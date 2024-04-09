import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { AccountUpdateJob } from './account.change.notification.dto';

export interface ITxMonitorJob {
  id: string;
  txHash: Hash;
  epoch: string;
  lastFinalizedBlockHash: BlockHash;
  referencePublishJob: AccountUpdateJob;
  providerId: string;
}
