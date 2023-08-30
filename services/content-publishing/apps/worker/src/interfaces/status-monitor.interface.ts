import { Hash } from "@polkadot/types/interfaces";

export interface IStatusMonitorJob {
  id: string;
  txHash: Hash;
  publisherJobId: string;
}
