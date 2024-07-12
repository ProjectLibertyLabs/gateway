import { BlockHash, Hash } from '@polkadot/types/interfaces';
import { GraphUpdateJob } from './graph.update.job';

export interface ITxMonitorJob {
  id: string;
  txHash: Hash;
  lastFinalizedBlockHash: BlockHash;
  referencePublishJob: GraphUpdateJob;
}
