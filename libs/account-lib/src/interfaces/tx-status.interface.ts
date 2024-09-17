import { TxMonitorJob } from '#types/dtos/account/transaction.request.dto';

export interface ITxStatus extends Pick<TxMonitorJob, 'providerId' | 'referenceId' | 'txHash' | 'type'> {
  successEvent: {
    section: string;
    method: string;
  };
  birth: number;
  death: number;
}
