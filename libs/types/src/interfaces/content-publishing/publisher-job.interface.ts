import { HexString } from '@polkadot/util/types';

export interface IPFSJobData {
  cid: string;

  payloadLength: number;
}

export interface OnChainJobData {
  payload: HexString;

  published: string;

  onBehalfOf?: string;

  intentId?: number;
}

interface IBasePublisherJob {
  id: string;

  schemaId: number;
}

interface IIpfsPublisherJob extends IBasePublisherJob {
  data: IPFSJobData;
}

interface IOnChainPublisherJob extends IBasePublisherJob {
  data: OnChainJobData;
}

export type IPublisherJob = IIpfsPublisherJob | IOnChainPublisherJob;

export function isIpfsJob(job: IPublisherJob): job is IIpfsPublisherJob {
  return 'cid' in job.data;
}

export function isOnChainJob(job: IPublisherJob): job is IOnChainPublisherJob {
  return 'payload' in job.data;
}
