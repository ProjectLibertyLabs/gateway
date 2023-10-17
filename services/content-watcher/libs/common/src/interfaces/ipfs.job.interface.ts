export interface IIPFSJob {
  msaId: string;
  providerId: string;
  cid: string;
  schemaId: number;
  blockNumber: bigint;
  index: number;
  requestId?: string;
}

export function createIPFSQueueJob(msaId: string, providerId: string, cid: string, index: number, requestId: string): { key: string; data: IIPFSJob } {
  return {
    key: `${msaId}:${providerId}:${index}:${requestId}`,
    data: {
      msaId,
      providerId,
      cid,
      index,
      requestId,
    } as IIPFSJob,
  };
}
