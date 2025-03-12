export interface BlockStatResult {
  cid: string;
  size: number;
  cumulativeSize: number;
  blocks: number;
  type: string;
}

export interface KuboRPCClient {
  block: {
    stat: (cid: string) => Promise<BlockStatResult>;
  };
}

export class CID {
  // eslint-disable-next-line no-empty-function
  constructor(private cidString: string) {}

  toString(): string {
    return this.cidString;
  }

  static parse(cid: string): CID {
    return new CID(cid);
  }
}

export const createKuboRPCClient = jest.fn(
  (): KuboRPCClient => ({
    block: {
      stat: jest.fn(async (cid: string) => ({
        cid,
        size: 1234,
        cumulativeSize: 5678,
        blocks: 2,
        type: 'mocked-type',
      })),
    },
  }),
);
