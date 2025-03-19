export const dummyCidV0 = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR';
export const dummyCidV1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

export class CID {
  // eslint-disable-next-line no-empty-function
  constructor(private cidString: string) {}

  toString(): string {
    return this.cidString;
  }

  static parse(cid: string): CID {
    if (cid === 'bad cid') {
      throw new SyntaxError('Non-base32 character');
    }
    return new CID(cid);
  }

  // eslint-disable-next-line class-methods-use-this
  toV0(): CID {
    return new CID(dummyCidV0);
  }

  // eslint-disable-next-line class-methods-use-this
  toV1(): CID {
    return new CID(dummyCidV1);
  }
}

export interface BlockStatResult {
  cid: string;
  size: number;
}

export interface PinLsResult {
  cid: CID;
  type: string;
  metadata?: Record<string, any>;
  name?: string;
}

export interface KuboRPCClient {
  block: {
    stat: (cid: string) => Promise<BlockStatResult>;
  };
  cat: (cid: string) => AsyncIterable<Uint8Array>;
  pin: {
    ls: (options: any) => AsyncIterable<PinLsResult>;
  };
  add: (entry: any, options?: any) => Promise<any>;
  version: (options?: any) => Promise<string>;
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
    cat: jest.fn(),
    pin: {
      ls: jest.fn(),
    },
    add: jest.fn(),
    version: jest.fn(),
  }),
);
