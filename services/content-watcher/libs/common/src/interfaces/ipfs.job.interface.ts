export interface IIPFSJob {
  msaId: string;
  providerId: string;
  schemaId: string;
  cid: string;
  blockNumber: string;
  index: number;
  requestId?: string;
}

export function createIPFSQueueJob(
  blockNumber: string,
  msaId: string,
  providerId: string,
  schemaId: string,
  cid: string,
  index: number,
  requestId: string,
): { key: string; data: IIPFSJob } {
  return {
    key: `${msaId}:${providerId}:${index}:${requestId}`,
    data: {
      msaId,
      providerId,
      schemaId,
      cid,
      blockNumber,
      index,
      requestId,
    } as IIPFSJob,
  };
}
