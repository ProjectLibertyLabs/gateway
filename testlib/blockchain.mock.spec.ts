import { SignedBlock } from '@polkadot/types/interfaces';
import { jest } from '@jest/globals';

export const createMockBlock = (extrinsics: any[]): SignedBlock => {
  const mockBlockHash = '0x123';
  const mockBlockNumber = 100;
  return {
    block: {
      header: {
        number: {
          toNumber: jest.fn().mockImplementation(() => mockBlockNumber),
        },
        hash: { toHex: jest.fn().mockImplementation(() => mockBlockHash) },
      },
      extrinsics,
      justifications: [],
    },
  } as any;
};

export const mockBlockchainRpcQueryServiceGetter = (
  blockchainRpcQueryService: any,
  capacityWithdrawn: boolean,
  extrinsicFailed: boolean,
) => {
  const mockEventsObject = {
    capacity: { CapacityWithdrawn: { is: jest.fn().mockReturnValue(capacityWithdrawn) } },
    system: { ExtrinsicFailed: { is: jest.fn().mockReturnValue(extrinsicFailed) } },
  };
  Object.defineProperty(blockchainRpcQueryService, 'events', {
    get: jest.fn().mockReturnValue(mockEventsObject),
    configurable: true,
  });
};
