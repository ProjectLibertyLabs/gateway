export interface IIPFSJob {
  msaId: string;
  providerId: string;
  schemaId: number;
  cid: string;
  blockNumber: number;
  index: number;
  requestId?: string;
  webhookUrl?: string;
}

export function createIPFSQueueJob(
  blockNumber: number,
  msaId: string,
  providerId: string,
  schemaId: number,
  cid: string,
  index: number,
  requestId?: string,
  webhookUrl?: string,
): { key: string; data: IIPFSJob } {
  return {
    key: `${msaId}:${providerId}:${blockNumber}:${index}:${requestId}`,
    data: {
      msaId,
      providerId,
      schemaId,
      cid,
      blockNumber,
      index,
      requestId,
      webhookUrl,
    },
  };
}
