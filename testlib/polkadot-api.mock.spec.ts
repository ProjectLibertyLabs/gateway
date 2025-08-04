/** This defines what the mock for 'ApiPromise' looks like; to be used in individual test files like so:
 * @example
 * import { mockApiPromise } from '#testlib/polkadot-api.mock.spec';
 *
 * jest.mock('@polkadot/api', () => {
 *   const originalModule = jest.requireActual<typeof import('@polkadot/api')>('@polkadot/api');
 *   return {
 *     __esModules: true,
 *     WsProvider: jest.fn().mockImplementation(() => originalModule.WsProvider),
 *     ApiPromise: jest.fn().mockImplementation(() => ({
 *       ...originalModule.ApiPromise,
 *       ...mockApiPromise,
 *     })),
 *   };
 *  });
 *
 */
import { EventEmitter2 } from '@nestjs/event-emitter';

export const mockApiPromise = {
  // Need this here; @polkadot Api really extends the 'Events' class, but it's marked #private,
  // and really it's just the same API as EventEmitter, so...
  ...EventEmitter2.prototype,
  isReady: Promise.resolve(),
  isReadyOrError: Promise.resolve(),
  createType: jest.fn(),
  query: {
    capacity: {
      currentEpochInfo: jest.fn(),
    },
    statefulStorage: {
      applyItemActionsV2: jest.fn(),
    },
  },
  rpc: {
    chain: {
      getBlockHash: jest.fn(),
    },
    system: {
      accountNextIndex: jest.fn(),
    },
  },
  genesisHash: {
    toHex: jest.fn(),
  },
  tx: {
    frequencyTxPayment: {
      payWithCapacity: jest.fn(),
      payWithCapacityBatchAll: jest.fn(),
    },
  },
};
