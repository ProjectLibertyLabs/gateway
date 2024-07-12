import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Injectable, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BlockHash } from '@polkadot/types/interfaces';
import { BlockchainService } from '#lib/blockchain/blockchain.service';
import { DEFAULT_REDIS_NAMESPACE, getRedisToken, InjectRedis } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { BlockchainScannerService } from './blockchain-scanner.service';

const mockProcessBlock = jest.fn();

const mockRedis = {
  provide: getRedisToken(DEFAULT_REDIS_NAMESPACE),
  useValue: { get: jest.fn(), set: jest.fn() },
};
const mockBlockchainService = {
  provide: BlockchainService,
  useValue: {
    getBlockHash: (blockNumber: number) =>
      blockNumber > 1
        ? {
            some: () => true,
            isEmpty: true,
          }
        : {
            some: () => true,
            isEmpty: false,
          },
  },
};

@Injectable()
class ScannerService extends BlockchainScannerService {
  constructor(@InjectRedis() redis: Redis, blockchainService: BlockchainService) {
    super(redis, blockchainService, new Logger('ScannerService'));
  }
  // eslint-disable-next-line
  protected processCurrentBlock(currentBlockHash: BlockHash, currentBlockNumber: number): Promise<void> {
    mockProcessBlock(currentBlockHash, currentBlockNumber);
    return Promise.resolve();
  }
}

const setupService = async (): Promise<ScannerService> => {
  jest.resetModules();
  const moduleRef = await Test.createTestingModule({
    providers: [mockRedis, Logger, mockBlockchainService, ScannerService],
  }).compile();
  return moduleRef.get<ScannerService>(ScannerService);
};

describe('BlockchainScannerService', () => {
  let service: ScannerService;

  beforeEach(async () => {
    service = await setupService();
  });

  describe('#scan', () => {
    it('Should call processCurrentBlock', async () => {
      await service.scan();
      expect(mockProcessBlock).toHaveBeenCalledWith(expect.anything(), 1);
    });
  });
});
