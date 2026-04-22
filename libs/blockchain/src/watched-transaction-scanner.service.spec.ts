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
    });
    describe('without transactions', () => {});
  });
});
