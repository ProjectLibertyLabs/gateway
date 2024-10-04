export interface FilePin {
  cid: string;
  cidBytes: Uint8Array;
  fileName: string;
  size: number;
  hash: string;
}
