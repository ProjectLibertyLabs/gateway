import { Injectable, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BlockHash, BlockNumber, SignedBlock } from '@polkadot/types/interfaces';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { BlockchainScannerService } from './blockchain-scanner.service';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { mockApiPromise } from '#testlib/polkadot-api.mock.spec';
import blockchainConfig, { IBlockchainNonProviderConfig } from '#blockchain/blockchain.config';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnyNumber } from '@polkadot/types/types';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';
import { mockRedisProvider } from '#testlib';

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

const mockBlockchainConfigProvider = GenerateMockConfigProvider<IBlockchainNonProviderConfig>(blockchainConfig.KEY, {
  frequencyTimeoutSecs: 10,
  frequencyApiWsUrl: new URL('ws://localhost:9944'),
  isDeployedReadOnly: false,
});

const mockBlockHash = {
  toString: jest.fn(() => '0x1234'),
  some: () => true,
  isEmpty: false,
} as unknown as BlockHash;

const mockSignedBlock = {
  block: {
    header: {
      number: 1,
    },
    extrinsics: [],
  },
};

const mockEmptyBlockHash = {
  toString: jest.fn(() => '0x00000'),
  some: () => false,
  isEmpty: true,
} as unknown as BlockHash;

@Injectable()
class ScannerService extends BlockchainScannerService {
  constructor(@InjectRedis() redis: Redis, blockchainService: BlockchainRpcQueryService) {
    super(redis, blockchainService, new PinoLogger(getPinoHttpOptions()));
  }
  // eslint-disable-next-line
  protected processCurrentBlock = jest.fn((_currentBlock: SignedBlock, _blockEvents: FrameSystemEventRecord[]) => {
    return Promise.resolve();
  });
}

describe('BlockchainScannerService', () => {
  let service: ScannerService;
  let blockchainService: BlockchainRpcQueryService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot({
          // Use this instance throughout the application
          global: true,
          // set this to `true` to use wildcards
          wildcard: false,
          // the delimiter used to segment namespaces
          delimiter: '.',
          // set this to `true` if you want to emit the newListener event
          newListener: false,
          // set this to `true` if you want to emit the removeListener event
          removeListener: false,
          // the maximum amount of listeners that can be assigned to an event
          maxListeners: 10,
          // show event name in memory leak message when more than maximum amount of listeners is assigned
          verboseMemoryLeak: false,
          // disable throwing uncaughtException if an error event is emitted and it has no listeners
          ignoreErrors: false,
        }),
        LoggerModule.forRoot(getPinoHttpOptions()),
      ],
      providers: [mockRedisProvider(), mockBlockchainConfigProvider, Logger, BlockchainRpcQueryService, ScannerService],
    }).compile();

    moduleRef.enableShutdownHooks();

    service = moduleRef.get<ScannerService>(ScannerService);
    blockchainService = moduleRef.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    const mockApi: any = await blockchainService.getApi();

    jest.spyOn(blockchainService, 'getBlock').mockResolvedValue(mockSignedBlock as unknown as SignedBlock);
    jest
      .spyOn(blockchainService, 'getBlockHash')
      .mockImplementation((blockNumber: BlockNumber | AnyNumber) =>
        Promise.resolve((blockNumber as unknown as number) > 1 ? mockEmptyBlockHash : mockBlockHash),
      );
    jest.spyOn(blockchainService, 'getLatestBlockNumber');
    jest.spyOn(blockchainService, 'getEvents').mockResolvedValue([]);

    mockApi.emit('connected'); // keeps the test suite from hanging when finished
  });

  describe('scan', () => {
    it('Should call processCurrentBlock', async () => {
      const processBlockSpy = jest.spyOn(service as unknown as any, 'processCurrentBlock');
      await service.scan();
      expect(processBlockSpy).toHaveBeenCalled();
    });
  });

  describe('checkScanParameters', () => {
    const latestFinalizedBlockNumber = 8;

    beforeEach(() => {
      jest.restoreAllMocks();
      service.scanParameters = { onlyFinalized: true };
      jest.spyOn(blockchainService, 'getLatestBlockNumber').mockResolvedValue(latestFinalizedBlockNumber);
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    describe('proccessing only finalized blocks', () => {
      beforeEach(() => {
        service.scanParameters = { onlyFinalized: true };
      });

      it('encounter a non-finalized block should throw', async () => {
        await expect(
          (service as unknown as any).checkScanParameters(latestFinalizedBlockNumber + 1, mockBlockHash),
        ).rejects.toThrow(/^Latest finalized block/);
      });

      it('encounter a finalized block should not throw', async () => {
        await expect(
          (service as unknown as any).checkScanParameters(latestFinalizedBlockNumber, mockBlockHash),
        ).resolves.toBeFalsy();
      });
    });

    describe('allowing unfinalized blocks', () => {
      beforeEach(() => {
        service.scanParameters = { onlyFinalized: false };
      });

      it('encounter an empty block should throw', async () => {
        await expect(
          (service as unknown as any).checkScanParameters(latestFinalizedBlockNumber, mockEmptyBlockHash),
        ).rejects.toThrow(/^Empty block/);
      });

      it('encounter a non-finalized block should not throw', async () => {
        await expect(
          (service as unknown as any).checkScanParameters(latestFinalizedBlockNumber + 1, mockBlockHash),
        ).resolves.toBeFalsy();
      });
    });
  });
});
