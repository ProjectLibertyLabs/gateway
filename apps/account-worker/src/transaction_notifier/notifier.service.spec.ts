import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { getRedisToken } from '@songkeys/nestjs-redis';
import { LoggerModule } from 'nestjs-pino';
import Redis from 'ioredis';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import accountWorkerConfig from '#account-worker/worker.config';
import { TxnNotifierService } from './notifier.service';
import { TransactionType } from '#types/tx-notification-webhook';
import { TXN_WATCH_LIST_KEY } from '#types/constants';
import { mockCacheManagerWith, mockRedisProvider } from '#testlib';
import { jest } from '@jest/globals';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { getPinoHttpOptions } from '#logger-lib';
import { BaseWebhookService } from '#webhooks-lib/base.webhook.service';
import { createMockBlock } from '#testlib/blockchain.mock.spec';

jest.mock<typeof import('#blockchain/blockchain-rpc-query.service')>('#blockchain/blockchain-rpc-query.service');
// mock NestJS Scheduler
jest.mock<typeof import('@nestjs/schedule')>('@nestjs/schedule');
jest.mock<typeof import('ioredis')>('ioredis');

describe('TxnNotifierService', () => {
  let service: TxnNotifierService;
  let blockchainRpcQueryService: BlockchainRpcQueryService;
  let providerWebhookService: BaseWebhookService;
  let cacheManager: Redis;

  const mockConfig = {
    trustUnfinalizedBlocks: false,
    blockchainScanIntervalSeconds: 6,
    healthCheckMaxRetries: 3,
  };

  const mockBlockchainRpcQueryServiceGetter = (capacityWithdrawn: boolean, extrinsicFailed: boolean) => {
    const mockEventsObject = {
      capacity: { CapacityWithdrawn: { is: jest.fn().mockReturnValue(capacityWithdrawn) } },
      system: { ExtrinsicFailed: { is: jest.fn().mockReturnValue(extrinsicFailed) } },
    };
    Object.defineProperty(blockchainRpcQueryService, 'events', { get: jest.fn().mockReturnValue(mockEventsObject) });
  };

  beforeEach(async () => {
    const mockProviderWebhookService = {
      notify: jest.fn(),
    };

    const mockCapacityService = {
      checkForSufficientCapacity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule.forRoot(getPinoHttpOptions())],
      providers: [
        BlockchainRpcQueryService,
        TxnNotifierService,
        {
          provide: SchedulerRegistry,
          useValue: { addInterval: jest.fn(), doesExist: jest.fn(), deleteInterval: jest.fn() },
        },
        mockRedisProvider(),
        { provide: accountWorkerConfig.KEY, useValue: mockConfig },
        { provide: CapacityCheckerService, useValue: mockCapacityService },
        { provide: BaseWebhookService, useValue: mockProviderWebhookService },
      ],
    }).compile();

    service = module.get<TxnNotifierService>(TxnNotifierService);
    blockchainRpcQueryService = module.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    cacheManager = module.get<jest.Mocked<Redis>>(getRedisToken('default'));
    providerWebhookService = module.get<BaseWebhookService>(BaseWebhookService);
  });

  describe('processCurrentBlock', () => {
    it('skips if no pending transactions', async () => {
      mockCacheManagerWith(cacheManager, [], '');
      const mockBlock = createMockBlock([]);
      await service.processCurrentBlock(mockBlock, []);
      expect(cacheManager.hvals).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY);
      expect(blockchainRpcQueryService.getCurrentCapacityEpoch).not.toHaveBeenCalled();
    });

    it('processes a successful transaction', async () => {
      const txHash = '0xabc';
      const section = 'handles';
      const method = 'HandleClaimed';
      const msaId = '1';
      const handle = 'test';

      const pendingTx = JSON.stringify({
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section, method },
        birth: 90,
        death: 110,
      });
      mockCacheManagerWith(cacheManager, [pendingTx], pendingTx);
      mockBlockchainRpcQueryServiceGetter(false, false);

      jest.spyOn(blockchainRpcQueryService as any, 'handlePublishHandleTxResult').mockReturnValue({
        msaId,
        handle,
        debugMsg: 'Handle claimed',
      });

      const mockExtrinsic = {
        hash: {
          toHex: jest.fn().mockReturnValue(txHash),
        },
      };

      const mockBlock = createMockBlock([mockExtrinsic]);
      const mockEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => idx === 0 } },
        event: { section, method, data: {} },
      };

      await service.processCurrentBlock(mockBlock, [mockEvent as any]);

      expect(providerWebhookService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: TransactionType.CREATE_HANDLE,
          msaId,
          handle,
        }),
      );
      expect(cacheManager.multi().hdel).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY, txHash);
    });

    it('handles failed extrinsic', async () => {
      const txHash = '0xabc';
      const pendingTx = JSON.stringify({
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section: 'handles', method: 'HandleClaimed' },
        birth: 90,
        death: 110,
      });
      mockCacheManagerWith(cacheManager, [pendingTx], pendingTx);
      mockBlockchainRpcQueryServiceGetter(false, true);

      const mockExtrinsic = {
        hash: {
          toHex: jest.fn().mockReturnValue(txHash),
        },
      };
      const mockBlock = createMockBlock([mockExtrinsic]);

      const mockFailureEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => idx === 0 } },
        event: {
          section: 'system',
          method: 'ExtrinsicFailed',
          data: {
            dispatchError: {
              asModule: {},
              registry: { findMetaError: jest.fn().mockReturnValue({ section: 'test', name: 'error' }) },
            },
          },
        },
      };
      await service.processCurrentBlock(mockBlock, [mockFailureEvent as any]);
      expect(providerWebhookService.notify).not.toHaveBeenCalled();
      expect(cacheManager.multi().hdel).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY, txHash);
    });

    it('handles expired transactions', async () => {
      const txHash = '0xexpired';
      const expiredTx = JSON.stringify({
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section: 'handles', method: 'HandleClaimed' },
        birth: 80,
        death: 100, // Death at current block number
      });

      mockCacheManagerWith(cacheManager, [expiredTx], '');
      const mockBlock = createMockBlock([]); // No matching extrinsics
      await service.processCurrentBlock(mockBlock, []);

      expect(cacheManager.multi().hdel).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY, txHash);
    });

    it('retries webhook notification on failure', async () => {
      const txHash = '0xabc';
      const pendingTx = JSON.stringify({
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section: 'handles', method: 'HandleClaimed' },
        birth: 90,
        death: 110,
      });

      mockCacheManagerWith(cacheManager, [pendingTx], pendingTx);
      const mockExtrinsic = {
        hash: {
          toHex: jest.fn().mockReturnValue(txHash),
        },
      };
      const mockBlock = createMockBlock([mockExtrinsic]);

      const mockEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => idx === 0 } },
        event: { section: 'handles', method: 'HandleClaimed', data: {} },
      };

      jest.mocked(blockchainRpcQueryService.handlePublishHandleTxResult).mockReturnValue({
        msaId: '1',
        handle: 'test',
        debugMsg: 'Handle claimed',
      });

      mockBlockchainRpcQueryServiceGetter(false, false);

      jest
        .spyOn(providerWebhookService as any, 'notify')
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(true);

      await service.processCurrentBlock(mockBlock, [mockEvent as any]);

      expect(providerWebhookService.notify).toHaveBeenCalledTimes(2);
    });

    it('updates epoch capacity when needed', async () => {
      const txHash = '0xabc';
      const pendingTx = JSON.stringify({
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section: 'handles', method: 'HandleClaimed' },
        birth: 90,
        death: 110,
      });
      mockCacheManagerWith(cacheManager, [pendingTx], pendingTx);

      const mockExtrinsic = {
        hash: {
          toHex: jest.fn().mockReturnValue(txHash),
        },
      };
      const mockBlock = createMockBlock([mockExtrinsic]);

      const mockCapacityEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => idx === 0 } },
        event: {
          section: 'capacity',
          method: 'CapacityWithdrawn',
          data: { amount: { toBigInt: () => 1000n } },
        },
      };

      mockBlockchainRpcQueryServiceGetter(true, false);

      jest.mocked(blockchainRpcQueryService.getCurrentCapacityEpoch).mockResolvedValue(1);
      jest.mocked(blockchainRpcQueryService.getCurrentEpochLength).mockResolvedValue(100);

      await service.processCurrentBlock(mockBlock, [mockCapacityEvent as any]);

      expect(blockchainRpcQueryService.getCurrentCapacityEpoch).toHaveBeenCalled();
      expect(cacheManager.get).toHaveBeenCalledWith('epochCapacity:1');
      expect(cacheManager.setex).toHaveBeenCalledWith('epochCapacity:1', expect.any(Number), '1000');
    });
  });
});
