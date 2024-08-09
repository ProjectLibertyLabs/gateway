import { HexString } from '@polkadot/util/types';
import { ProviderGraphUpdateJob } from './provider.graph.update-job.interface';

export interface ITxStatus {
  providerId?: string;

  referenceId: string;

  txHash: HexString;

  successEvent: {
    section: string;

    method: string;
  };

  referenceJob: ProviderGraphUpdateJob;

  birth: number;

  death: number;
}
