import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { getRedisToken } from '@songkeys/nestjs-redis';
import { LoggerModule } from 'nestjs-pino';
import Redis from 'ioredis';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import workerConfig from '#content-publishing-worker/worker.config';
import { TxnNotifierService } from './notifier.service';
import { TransactionType } from '#types/tx-notification-webhook';
import { TXN_WATCH_LIST_KEY } from '#types/constants';
import { mockCacheManagerWith, mockRedisProvider } from '#testlib';
import { jest } from '@jest/globals';
import { BlockchainRpcQueryService, PayWithCapacityBatchAllCalls } from '#blockchain/blockchain-rpc-query.service';
import { getPinoHttpOptions } from '#logger-lib';
import { BaseWebhookService } from '#webhooks-lib/base.webhook.service';
import { createMockBlock, mockBlockchainRpcQueryServiceGetter } from '#testlib/blockchain.mock.spec';

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
        { provide: workerConfig.KEY, useValue: mockConfig },
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
    const section = 'frequencyTxPayment';
    const method = 'payWithCapacityBatchAll';
    const txHash = '0xabc';
    const txType = TransactionType.CAPACITY_BATCH;
    const msaId = '1234';
    const amount = '44444';
    const debugMsg = `${amount} Capacity withdrawn by MSA ${msaId}`;

    const pendingCapacityBatchTx = JSON.stringify({
      txHash,
      type: txType,
      successEvent: { section, method },
      birth: 90,
      death: 110,
    });
    const mockExtrinsic = {
      hash: {
        toHex: jest.fn().mockReturnValue(txHash),
      },
    };

    const mockCalls: PayWithCapacityBatchAllCalls = {
      debugMsg: 'This is a debug msg',
      calls: [{ section: 'doesnt matter', method: 'doesnt matter' }],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('skips if no pending transactions', async () => {
      mockCacheManagerWith(cacheManager, [], '');
      const mockBlock = createMockBlock([]);
      await service.processCurrentBlock(mockBlock, []);
      expect(cacheManager.hvals).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY);
      expect(blockchainRpcQueryService.getCurrentCapacityEpoch).not.toHaveBeenCalled();
    });

    it('processes a successful transaction', async () => {
      mockCacheManagerWith(cacheManager, [pendingCapacityBatchTx], pendingCapacityBatchTx);
      mockBlockchainRpcQueryServiceGetter(blockchainRpcQueryService, false, false);
      jest.mocked(blockchainRpcQueryService.handlePayWithCapacityBatchAll).mockReturnValue(mockCalls);
      jest.mocked(blockchainRpcQueryService.handleCapacityWithdrawn).mockReturnValue({ msaId, amount, debugMsg });

      const mockBlock = createMockBlock([mockExtrinsic]);
      const mockEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => idx === 0 } },
        event: { section, method, data: { msaId, amount, debugMsg } },
      };
      await service.processCurrentBlock(mockBlock, [mockEvent as any]);

      expect(providerWebhookService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          calls: mockCalls.calls,
          providerId: msaId,
          referenceId: undefined,
          transactionType: txType,
          txHash,
          capacityWithdrawnEvent: { amount, msaId },
        }),
      );
      expect(cacheManager.multi().hdel).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY, txHash);
    });

    it('handles failed extrinsic', async () => {
      mockCacheManagerWith(cacheManager, [pendingCapacityBatchTx], pendingCapacityBatchTx);
      mockBlockchainRpcQueryServiceGetter(blockchainRpcQueryService, false, true);

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
      const expiredHash = '0xexpired';
      // TODO: change to a supported transaction type
      const expiredTx = JSON.stringify({
        txHash: expiredHash,
        type: txType,
        successEvent: { section, method },
        birth: 80,
        death: 100, // Death at current block number
      });

      mockCacheManagerWith(cacheManager, [expiredTx], '');
      const mockBlock = createMockBlock([]); // No matching extrinsics
      await service.processCurrentBlock(mockBlock, []);

      expect(cacheManager.multi().hdel).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY, expiredHash);
    });

    it('retries webhook notification on failure', async () => {
      mockCacheManagerWith(cacheManager, [pendingCapacityBatchTx], pendingCapacityBatchTx);
      const mockBlock = createMockBlock([mockExtrinsic]);

      const mockEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => idx === 0 } },
        event: { section, method, data: {} },
      };

      jest.spyOn(blockchainRpcQueryService, 'handlePayWithCapacityBatchAll').mockReturnValue(mockCalls);
      jest.spyOn(blockchainRpcQueryService, 'handleCapacityWithdrawn').mockReturnValue({ msaId, amount, debugMsg });

      mockBlockchainRpcQueryServiceGetter(blockchainRpcQueryService, false, false);

      jest
        .spyOn(providerWebhookService as any, 'notify')
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(true);

      await service.processCurrentBlock(mockBlock, [mockEvent as any]);

      expect(providerWebhookService.notify).toHaveBeenCalledTimes(2);
    });

    it('updates epoch capacity when needed', async () => {
      mockCacheManagerWith(cacheManager, [pendingCapacityBatchTx], pendingCapacityBatchTx);

      const mockBlock = createMockBlock([mockExtrinsic]);

      const mockCapacityEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => idx === 0 } },
        event: {
          section: 'capacity',
          method: 'CapacityWithdrawn',
          data: { amount: { toBigInt: () => 1000n } },
        },
      };

      mockBlockchainRpcQueryServiceGetter(blockchainRpcQueryService, true, false);

      jest.mocked(blockchainRpcQueryService.getCurrentCapacityEpoch).mockResolvedValue(1);
      jest.mocked(blockchainRpcQueryService.getCurrentEpochLength).mockResolvedValue(100);

      await service.processCurrentBlock(mockBlock, [mockCapacityEvent as any]);

      expect(blockchainRpcQueryService.getCurrentCapacityEpoch).toHaveBeenCalled();
      expect(cacheManager.get).toHaveBeenCalledWith('epochCapacity:1');
      expect(cacheManager.setex).toHaveBeenCalledWith('epochCapacity:1', expect.any(Number), '1000');
    });
  });
});
// TODO: implement
