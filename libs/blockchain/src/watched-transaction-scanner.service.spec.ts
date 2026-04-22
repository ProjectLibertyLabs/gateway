import {
  IWatchedTransactionScannerConfig,
  WatchedTransactionScannerService,
} from '#blockchain/watched-transaction-scanner.service';
import { GenerateMockConfigProvider, mockApiPromise, mockEventEmitterConfig, mockRedisProvider } from '#testlib';
import blockchainConfig, { IBlockchainReadOnlyConfig } from '#blockchain/blockchain.config';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { getPinoHttpOptions } from '#logger-lib';
import { HexString } from '@polkadot/util/types';
import { SchedulerRegistry } from '@nestjs/schedule';
import { jest } from '@jest/globals';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import { createMockBlock, mockBlockchainRpcQueryServiceGetter } from '#testlib/blockchain.mock.spec';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { TXN_WATCH_LIST_KEY } from '#types/constants';

jest.mock('@nestjs/schedule');

jest.mock('@polkadot/api', () => {
  const originalModule = jest.requireActual<typeof import('@polkadot/api')>('@polkadot/api');
  return {
    __esModules: true,
    WsProvider: jest.fn().mockImplementation(() => originalModule.WsProvider),
    ApiPromise: jest.fn().mockImplementation(() => ({
      ...originalModule.ApiPromise,
      ...mockApiPromise,
    })),
  };
});

const mockBlockchainConfigProvider = GenerateMockConfigProvider<IBlockchainReadOnlyConfig>(blockchainConfig.KEY, {
  frequencyTimeoutSecs: 10,
  frequencyApiWsUrl: new URL('ws://localhost:9944'),
  isDeployedReadOnly: false,
  providerId: 989n,
});

const mockScannerConfig: IWatchedTransactionScannerConfig = {
  blockchainScanIntervalSeconds: 10,
  trustUnfinalizedBlocks: false,
};

type TestTxStatus = {
  birth: number;
  death: number;
  txHash: HexString;
  successEvent: {
    section: string;
    method: string;
  };
};
const createMockTxStatus = (section: string, method: string, txHash: HexString = '0xabcd'): TestTxStatus => {
  return {
    birth: 11,
    death: 111,
    txHash,
    successEvent: { section, method },
  };
};

const mockSchedulerRegistry = {
  addTimeout: jest.fn(),
  deleteTimeout: jest.fn(),
  doesExist: jest.fn().mockReturnValue(true),
};
const mockCapacityService = {
  checkForSufficientCapacity: jest.fn(),
};

@Injectable()
class TestScannerService extends WatchedTransactionScannerService<TestTxStatus> {
  public handleTransactionSuccess = jest.fn(async (_context) => {});
  public handleTransactionFailure = jest.fn(async (_context) => {});
  public handleTransactionExpired = jest.fn(async (_context) => {});
  constructor(
    blockchainService: BlockchainRpcQueryService,
    protected readonly logger: PinoLogger,
    @InjectRedis() redis: Redis,
  ) {
    super(
      blockchainService,
      mockSchedulerRegistry as unknown as SchedulerRegistry,
      redis,
      mockScannerConfig,
      mockCapacityService as unknown as CapacityCheckerService,
      logger,
    );
  }
}

describe('WatchedTransactionScannerService', () => {
  let service: WatchedTransactionScannerService<TestTxStatus>;
  let blockchainService: BlockchainRpcQueryService;
  let setEpochCapacitySpy;
  let handleTransactionSuccessSpy;
  let handleTransactionFailureSpy;
  let handleTransactionExpiredSpy;
  let mockRedis: any;

  beforeAll(async () => {
    const redisProvider = mockRedisProvider();
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(mockEventEmitterConfig), LoggerModule.forRoot(getPinoHttpOptions())],
      providers: [redisProvider, mockBlockchainConfigProvider, Logger, BlockchainRpcQueryService, TestScannerService],
    }).compile();

    moduleRef.enableShutdownHooks();
    mockRedis = redisProvider.useValue;

    service = moduleRef.get<TestScannerService>(TestScannerService);
    setEpochCapacitySpy = jest.spyOn(service, 'setEpochCapacity');
    handleTransactionSuccessSpy = jest.spyOn(service, 'handleTransactionSuccess');
    handleTransactionFailureSpy = jest.spyOn(service, 'handleTransactionFailure');
    handleTransactionExpiredSpy = jest.spyOn(service, 'handleTransactionExpired');

    blockchainService = moduleRef.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    jest.spyOn(blockchainService, 'getCurrentCapacityEpoch').mockResolvedValue(1);
    const mockApi: any = await blockchainService.getApi();
    jest.spyOn(service, 'scan');
    mockApi.emit('connected'); // keeps the test suite from hanging when finished
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processCurrentBlock', () => {
    describe('with transactions', () => {
      const section = 'foo';
      const method = 'bar';
      const txHash = '0xabcd';
      const mockExtrinsic = {
        hash: {
          toHex: jest.fn().mockReturnValue(txHash),
        },
      };

      describe('with events', () => {
        const capacityWithdrawn = true;
        const dispatchError = {
          asModule: { index: 0 },
          registry: {
            findMetaError: jest.fn(),
          },
        };

        let mockEvent = {
          phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => idx === 0 } },
          event: {
            section,
            method,
            data: {
              amount: {
                toBigInt: jest.fn().mockReturnValue(1n),
              },
              dispatchError,
            },
          },
        } as unknown as FrameSystemEventRecord;

        it('processes a successful Transaction', async () => {
          const extrinsicFailed = false;
          mockBlockchainRpcQueryServiceGetter(blockchainService, capacityWithdrawn, extrinsicFailed);
          const watchedTxStatusList: TestTxStatus[] = [createMockTxStatus('foo', 'bar')];
          jest.spyOn(service, 'loadPendingTransactions').mockResolvedValue(watchedTxStatusList);
          mockRedis.hdel.mockReturnThis();

          await service.processCurrentBlock(createMockBlock([mockExtrinsic]), [mockEvent]);
          expect(handleTransactionSuccessSpy).toHaveBeenCalled();
          expect(mockRedis.exec).toHaveBeenCalled();
        });

        it('processes a failed transaction', async () => {
          const extrinsicFailed = true;
          mockBlockchainRpcQueryServiceGetter(blockchainService, capacityWithdrawn, extrinsicFailed);
          mockRedis.hdel.mockReturnThis();

          const watchedTxStatusList: TestTxStatus[] = [createMockTxStatus('foo', 'bar')];
          jest.spyOn(service, 'loadPendingTransactions').mockResolvedValue(watchedTxStatusList);
          await service.processCurrentBlock(createMockBlock([mockExtrinsic]), [mockEvent]);
          expect(handleTransactionFailureSpy).toHaveBeenCalled();
          expect(mockRedis.exec).toHaveBeenCalled();
        });
      });
      describe('without events', () => {
        it('skips checking and updating capacity and any handlers', async () => {
          const watchedTxStatusList: TestTxStatus[] = [createMockTxStatus('foo', 'bar')];

          jest.spyOn(service, 'loadPendingTransactions').mockResolvedValue(watchedTxStatusList);

          await service.processCurrentBlock(createMockBlock([mockExtrinsic]), []);
          [setEpochCapacitySpy, handleTransactionSuccessSpy, handleTransactionFailureSpy].forEach((spy) =>
            expect(spy).not.toHaveBeenCalled(),
          );
        });
      });

      it('removes succeeded/failed/non-terminal txns and expires any remaining pending txn', async () => {
        const successHash = '0xaaaa';
        const failedHash = '0xbbbb';
        const noTerminalHash = '0xcccc';
        const expiredHash = '0xdddd';

        const watchedTxStatusList: TestTxStatus[] = [
          createMockTxStatus(section, method, successHash),
          createMockTxStatus(section, method, failedHash),
          createMockTxStatus(section, method, noTerminalHash),
          { ...createMockTxStatus(section, method, expiredHash), death: 99 },
        ];
        jest.spyOn(service, 'loadPendingTransactions').mockResolvedValue(watchedTxStatusList);

        // Don't use mockBlockchainRpcQueryServiceGetter from before because we need to mock different
        // responses for different events.
        Object.defineProperty(blockchainService, 'events', {
          get: jest.fn().mockReturnValue({
            capacity: {
              CapacityWithdrawn: {
                is: jest.fn((event: any) => event.section === 'capacity' && event.method === 'CapacityWithdrawn'),
              },
            },
            system: {
              ExtrinsicFailed: {
                is: jest.fn((event: any) => event.section === 'system' && event.method === 'ExtrinsicFailed'),
              },
            },
          }),
          configurable: true,
        });

        const mockExtrinsicForHash = (hash: HexString) => ({
          hash: { toHex: jest.fn().mockReturnValue(hash) },
        });

        const dispatchError = {
          asModule: { index: 0 },
          registry: { findMetaError: jest.fn() },
        };

        const eventForIdx = (idx: number, event: any): FrameSystemEventRecord =>
          ({
            phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (txIdx: number) => txIdx === idx } },
            event,
          }) as unknown as FrameSystemEventRecord;

        const handleTransactionWithoutTerminalEventSpy = jest.spyOn(
          service as unknown as { handleTransactionWithoutTerminalEvent: (...args: any[]) => any },
          'handleTransactionWithoutTerminalEvent',
        );

        mockRedis.hdel.mockReturnThis();

        await service.processCurrentBlock(
          createMockBlock([
            mockExtrinsicForHash(successHash),
            mockExtrinsicForHash(failedHash),
            mockExtrinsicForHash(noTerminalHash),
          ]),
          [
            eventForIdx(0, { section, method }),
            eventForIdx(1, { section: 'system', method: 'ExtrinsicFailed', data: { dispatchError } }),
            eventForIdx(2, {
              section: 'capacity',
              method: 'CapacityWithdrawn',
              data: { amount: { toBigInt: jest.fn().mockReturnValue(1n) } },
            }),
          ],
        );

        expect(handleTransactionSuccessSpy).toHaveBeenCalledWith(expect.objectContaining({ txHash: successHash }));
        expect(handleTransactionFailureSpy).toHaveBeenCalledWith(expect.objectContaining({ txHash: failedHash }));
        expect(handleTransactionWithoutTerminalEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({ txHash: noTerminalHash }),
        );

        // The only pending txn left after processing extrinsics should be the expired one.
        expect(handleTransactionExpiredSpy).toHaveBeenCalledTimes(1);
        expect(handleTransactionExpiredSpy).toHaveBeenCalledWith(expect.objectContaining({ txHash: expiredHash }), 100);

        const deletedHashes = mockRedis.hdel.mock.calls
          .filter(([key]) => key === TXN_WATCH_LIST_KEY)
          .map(([, hash]) => hash);
        expect(deletedHashes).toEqual(expect.arrayContaining([successHash, failedHash, noTerminalHash, expiredHash]));
        expect(deletedHashes).toHaveLength(4);

        // Ensure we enqueue all deletions before executing the pipeline.
        const execOrder = mockRedis.exec.mock.invocationCallOrder[0];
        mockRedis.hdel.mock.invocationCallOrder.forEach((order) => expect(order).toBeLessThan(execOrder));
      });
    });
  });
});
