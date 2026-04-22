import { Injectable, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BlockHash, BlockNumber, SignedBlock } from '@polkadot/types/interfaces';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { BlockchainScannerService } from './blockchain-scanner.service';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { mockApiPromise } from '#testlib/polkadot-api.mock.spec';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import blockchainConfig, { IBlockchainReadOnlyConfig } from '#blockchain/blockchain.config';
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

const mockBlockchainConfigProvider = GenerateMockConfigProvider<IBlockchainReadOnlyConfig>(blockchainConfig.KEY, {
  frequencyTimeoutSecs: 10,
  frequencyApiWsUrl: new URL('ws://localhost:9944'),
  isDeployedReadOnly: false,
  providerId: 989n,
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
  constructor(
    @InjectRedis() redis: Redis,
    blockchainService: BlockchainRpcQueryService,
    protected readonly logger: PinoLogger,
  ) {
    super(redis, blockchainService, logger);
  }

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
          global: true,
          wildcard: false,
          delimiter: '.',
          newListener: false,
          removeListener: false,
          maxListeners: 10,
          verboseMemoryLeak: false,
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
