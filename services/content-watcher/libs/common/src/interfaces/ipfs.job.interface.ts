export interface IIPFSJob {
  msaId: string;
  providerId: string;
  cid: string;
  blockNumber: bigint;
  index: number;
  requestId?: string;
}

export function createIPFSQueueJob(msaId: string, providerId: string, blockNumber: bigint, cid: string, index: number, requestId: string): { key: string; data: IIPFSJob } {
  return {
    key: `${msaId}:${providerId}:${blockNumber}:${index}`,
    data: {
      msaId,
      providerId,
      cid,
      blockNumber,
      index,
    } as IIPFSJob,
  };
}
