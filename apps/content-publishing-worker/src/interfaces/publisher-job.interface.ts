export interface IPFSJobData {
  cid: string;
  payloadLength: number;
}

export interface IPublisherJob {
  id: string;
  schemaId: number;
  data: IPFSJobData;
}
