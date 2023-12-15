import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { GraphUpdateJob } from './graph.update.job';

export interface ITxMonitorJob {
  id: string;
  txHash: Hash;
  epoch: string;
  lastFinalizedBlockHash: BlockHash;
  referencePublishJob: GraphUpdateJob;
}
