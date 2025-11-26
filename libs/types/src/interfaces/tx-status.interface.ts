import { TxMonitorJob } from '#types/dtos/account/transaction.request.dto';
import { HexString } from '@polkadot/util/types';
import { IPublisherJob } from './content-publishing/publisher-job.interface';
import { ProviderGraphUpdateJob } from './graph';

export interface ITxStatusBase {
  providerId?: string;

  referenceId?: string;

  txHash: HexString;

  successEvent?: {
    section: string;

    method: string;
  };

  birth: number;

  death: number;
}

export interface IAccountTxStatus extends ITxStatusBase, Pick<TxMonitorJob, 'type'> {}

export interface IContentTxStatus extends ITxStatusBase {
  referencePublishJob: IPublisherJob;
}

export interface IGraphTxStatus extends ITxStatusBase {
  // Make required
  referenceId: ITxStatusBase['referenceId'];

  referenceJob: ProviderGraphUpdateJob;
}

export interface IHcpTxStatus extends ITxStatusBase {
  // Make required
  providerId: string;
  referenceId: string;
}
