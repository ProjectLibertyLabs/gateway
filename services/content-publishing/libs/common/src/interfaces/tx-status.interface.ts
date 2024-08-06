import { HexString } from '@dsnp/activity-content/types';
import { IPublisherJob } from 'apps/worker/src/interfaces';

export interface ITxStatus {
  providerId?: string;

  referenceId?: string;

  txHash: HexString;

  successEvent: {
    section: string;

    method: string;
  };

  birth: number;

  death: number;

  referencePublishJob: IPublisherJob;
}
