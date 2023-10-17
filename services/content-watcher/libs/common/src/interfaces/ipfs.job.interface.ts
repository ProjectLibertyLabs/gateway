export interface IIPFSJob {
  msaId: string;
  providerId: string;
  cid: string;
  schemaId: number;
  blockNumber: bigint;
  index: number;
  requestId?: string;
}

export function createIPFSQueueJob(
  schemaId: number,
  msaId: string,
  providerId: string,
  blockNumber: bigint,
  cid: string,
  index: number,
  requestId: string,
): { key: string; data: IIPFSJob } {
  return {
    key: `${msaId}:${providerId}:${blockNumber}:${index}:${schemaId}`,
    data: {
      msaId,
      providerId,
      cid,
      blockNumber,
      index,
      requestId,
      schemaId,
    } as IIPFSJob,
  };
}
