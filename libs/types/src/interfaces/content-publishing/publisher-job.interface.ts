export interface IPFSJobData {
  cid: string;
  payloadLength: number;
}

export interface OnChainJobData {
  payload: Uint8Array;
  onBehalfOf?: string;
}

export interface IPublisherJob {
  id: string;
  schemaId: number;
  data: IPFSJobData | OnChainJobData;
}

export function isIpfsJob(data: IPFSJobData | OnChainJobData): data is IPFSJobData {
  // eslint-disable-next-line dot-notation
  return typeof data['cid'] === 'string';
}
