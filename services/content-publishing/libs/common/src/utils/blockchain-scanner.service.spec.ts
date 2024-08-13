import { Injectable, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Hash, SignedBlock } from '@polkadot/types/interfaces';
import { BlockchainService } from '#libs/blockchain/blockchain.service';
import { DEFAULT_REDIS_NAMESPACE, getRedisToken, InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { BlockchainScannerService } from './blockchain-scanner.service';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';

const mockRedis = {
  provide: getRedisToken(DEFAULT_REDIS_NAMESPACE),
  useValue: { get: jest.fn(), set: jest.fn() },
};

const mockBlockHash = {
  toString: jest.fn(() => '0x1234'),
  some: () => true,
};

const mockSignedBlock = {
  block: {
    header: {
      number: 1,
    },
    extrinsics: [],
  },
};

Object.defineProperty(mockBlockHash, 'isEmpty', {
  get: jest.fn(() => false),
});

const mockEmptyBlockHash = {
  toString: jest.fn(() => '0x00000'),
  some: () => false,
};
Object.defineProperty(mockEmptyBlockHash, 'isEmpty', {
  get: jest.fn(() => true),
});
const mockBlockchainService = {
  getBlock: jest.fn((blockHash?: string | Hash) => mockSignedBlock as unknown as SignedBlock),
  getBlockHash: jest.fn((blockNumber: number) => (blockNumber > 1 ? mockEmptyBlockHash : mockBlockHash)),
  getLatestFinalizedBlockNumber: jest.fn(),
};
Object.defineProperty(mockBlockchainService, 'api', {
  get: jest.fn(() => ({
    at: jest.fn(() => ({
      query: {
        system: {
          events: jest.fn(() => ({
            toArray: jest.fn(() => []),
          })),
        },
      },
    })),
  })),
});

const mockBlockchainServiceProvider = {
  provide: BlockchainService,
  useValue: mockBlockchainService,
};

@Injectable()
class ScannerService extends BlockchainScannerService {
  constructor(@InjectRedis() redis: Redis, blockchainService: BlockchainService) {
    super(redis, blockchainService, new Logger('ScannerService'));
  }
  // eslint-disable-next-line
  protected processCurrentBlock = jest.fn((_currentBlock: SignedBlock, _blockEvents: FrameSystemEventRecord[]) => {
    return Promise.resolve();
  });
}

describe('BlockchainScannerService', () => {
  let service: ScannerService;
  let blockchainService: BlockchainService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [mockRedis, Logger, mockBlockchainServiceProvider, ScannerService],
    }).compile();
    service = moduleRef.get<ScannerService>(ScannerService);
    blockchainService = moduleRef.get<BlockchainService>(BlockchainService);
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
      jest.spyOn(blockchainService, 'getLatestFinalizedBlockNumber').mockResolvedValue(latestFinalizedBlockNumber);
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
