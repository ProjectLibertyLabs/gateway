import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { getRedisToken } from '@songkeys/nestjs-redis';
import { LoggerModule } from 'nestjs-pino';
import Redis from 'ioredis';
import { CapacityCheckerService } from '#blockchain/capacity-checker.service';
import { ProviderWebhookService } from '#account-lib/services/provider-webhook.service';
import accountWorkerConfig from '#account-worker/worker.config';
import { TxnNotifierService } from './notifier.service';
import { TransactionType } from '#types/account-webhook';
import { TXN_WATCH_LIST_KEY } from '#types/constants';
import { SignedBlock } from '@polkadot/types/interfaces';
import { mockRedisProvider } from '#testlib';
import { jest } from '@jest/globals';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { getPinoHttpOptions } from '#logger-lib';

// mock BlockchainRpcQueryService
jest.mock<typeof import('#blockchain/blockchain-rpc-query.service')>('#blockchain/blockchain-rpc-query.service');
// mock NestJS Scheduler
jest.mock<typeof import('@nestjs/schedule')>('@nestjs/schedule');
jest.mock<typeof import('ioredis')>('ioredis');
// jest.mock<typeof import('nestjs-pino')>('nestjs-pino');

describe('TxnNotifierService', () => {
  let service: TxnNotifierService;
  let blockchainRpcQueryService: BlockchainRpcQueryService;
  let providerWebhookService: ProviderWebhookService;
  let cacheManager: Redis;

  const mockConfig = {
    trustUnfinalizedBlocks: false,
    blockchainScanIntervalSeconds: 6,
    healthCheckMaxRetries: 3,
  };

  const spyOnCacheManagerWith = (hvals: string[], hgetVal: string) => {
    jest.mocked(cacheManager.hvals).mockResolvedValue(hvals);
    jest.mocked(cacheManager.hget).mockResolvedValue(hgetVal);
    // jest.mocked()
    //   multi: () => this,
    //   exec: jest.fn(),
    // }));
  };

  beforeEach(async () => {
    const mockProviderWebhookService = {
      getTransactionNotifyUrl: jest.fn(), // .mockReturnValue('http://localhost/notify'),
      sendTransactionNotify: jest.fn(), //.mockResolvedValue(true),
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
        { provide: ProviderWebhookService, useValue: mockProviderWebhookService },
      ],
    }).compile();

    service = module.get<TxnNotifierService>(TxnNotifierService);
    blockchainRpcQueryService = module.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
    cacheManager = module.get<jest.Mocked<Redis>>(getRedisToken('default'));
    providerWebhookService = module.get<ProviderWebhookService>(ProviderWebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processCurrentBlock', () => {
    const mockBlockHash = '0x123';
    const mockBlockNumber = 100;
    const createMockBlock = (extrinsics: any[] = []): SignedBlock =>
      ({
        block: {
          header: {
            number: { toNumber: () => mockBlockNumber },
            hash: { toHex: () => mockBlockHash },
          },
          extrinsics: extrinsics.map((ext) => ({
            ...ext,
            hash: { toHex: () => ext.hash },
          })),
        },
      }) as any;

    let mockPipeline: { hdel: ReturnType<typeof jest.fn>; exec: ReturnType<typeof jest.fn> };

    beforeEach(() => {
      mockPipeline = { hdel: jest.fn().mockReturnThis(), exec: jest.fn() };
      jest.spyOn(cacheManager as any, 'multi').mockReturnValue(mockPipeline);
    });

    it('should skip if no pending transactions', async () => {
      spyOnCacheManagerWith([], '');
      const mockBlock = createMockBlock();
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
      spyOnCacheManagerWith([pendingTx], pendingTx);

      const mockEventsObject = {
        capacity: { CapacityWithdrawn: { is: jest.fn().mockReturnValue(false) } },
        system: { ExtrinsicFailed: { is: jest.fn().mockReturnValue(false) } },
      };
      Object.defineProperty(blockchainRpcQueryService, 'events', { get: jest.fn().mockReturnValue(mockEventsObject) });

      jest.spyOn(blockchainRpcQueryService as any, 'handlePublishHandleTxResult').mockReturnValue({
        msaId,
        handle,
        debugMsg: 'Handle claimed',
      });

      const mockBlock = createMockBlock([{ hash: txHash }]);
      const mockEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (_idx: number) => true } },
        event: { section, method, data: {} },
      };

      await service.processCurrentBlock(mockBlock, [mockEvent as any]);

      expect(providerWebhookService.sendTransactionNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: TransactionType.CREATE_HANDLE,
          msaId,
          handle,
        }),
      );
      expect(cacheManager.multi().hdel).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY, txHash);
    });

    it('should handle failed extrinsic', async () => {
      const txHash = '0xabc';
      const pendingTx = {
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section: 'handles', method: 'HandleClaimed' },
        birth: 90,
        death: 110,
      };

      jest.spyOn(cacheManager as any, 'hvals').mockResolvedValue([JSON.stringify(pendingTx)]);
      jest.spyOn(cacheManager as any, 'hget').mockResolvedValue(JSON.stringify(pendingTx));
      const mockEventsObject = {
        capacity: { CapacityWithdrawn: { is: jest.fn().mockReturnValue(false) } },
        system: { ExtrinsicFailed: { is: jest.fn().mockReturnValue(true) } },
      };
      Object.defineProperty(blockchainRpcQueryService, 'events', {
        configurable: true,
        get: jest.fn().mockReturnValue(mockEventsObject),
      });

      const mockExtrinsic = { hash: '0xabc' };
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
      expect(providerWebhookService.sendTransactionNotify).not.toHaveBeenCalled();
      expect(cacheManager.multi().hdel).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY, txHash);
    });

    it('should handle expired transactions', async () => {
      const txHash = '0xexpired';
      const expiredTx = {
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section: 'handles', method: 'HandleClaimed' },
        birth: 80,
        death: 100, // Death at current block number
      };

      jest.spyOn(cacheManager, 'hvals').mockResolvedValue([JSON.stringify(expiredTx)]);
      const mockBlock = createMockBlock([]); // No matching extrinsics

      await service.processCurrentBlock(mockBlock, []);

      expect(cacheManager.multi().hdel).toHaveBeenCalledWith(TXN_WATCH_LIST_KEY, txHash);
    });

    it('should retry webhook notification on failure', async () => {
      const txHash = '0xabc';
      const pendingTx = {
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section: 'handles', method: 'HandleClaimed' },
        birth: 90,
        death: 110,
      };

      jest.spyOn(cacheManager as any, 'hvals').mockResolvedValue([JSON.stringify(pendingTx)]);
      jest.spyOn(cacheManager as any, 'hget').mockResolvedValue(JSON.stringify(pendingTx));

      const mockExtrinsic = { hash: '0xabc' };
      const mockBlock = createMockBlock([mockExtrinsic]);

      const mockEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (_idx: number) => true } },
        event: { section: 'handles', method: 'HandleClaimed', data: {} },
      };

      jest.spyOn(blockchainRpcQueryService as any, 'handlePublishHandleTxResult').mockReturnValue({
        msaId: '1',
        handle: 'test',
        debugMsg: 'Handle claimed',
      });
      const mockEventsObject = {
        capacity: { CapacityWithdrawn: { is: jest.fn().mockReturnValue(false) } },
        system: { ExtrinsicFailed: { is: jest.fn().mockReturnValue(false) } },
      };
      Object.defineProperty(blockchainRpcQueryService, 'events', { get: jest.fn().mockReturnValue(mockEventsObject) });

      jest
        .spyOn(providerWebhookService as any, 'sendTransactionNotify')
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(true);

      await service.processCurrentBlock(mockBlock, [mockEvent as any]);

      expect(providerWebhookService.sendTransactionNotify).toHaveBeenCalledTimes(2);
    });

    it('should update epoch capacity when needed', async () => {
      const txHash = '0xabc';
      const pendingTx = {
        txHash,
        type: TransactionType.CREATE_HANDLE,
        successEvent: { section: 'handles', method: 'HandleClaimed' },
        birth: 90,
        death: 110,
      };

      jest.spyOn(cacheManager as any, 'hvals').mockResolvedValue([JSON.stringify(pendingTx)]);
      jest.spyOn(cacheManager as any, 'hget').mockResolvedValue(JSON.stringify(pendingTx));

      const mockExtrinsic = { hash: '0xabc' };
      const mockBlock = createMockBlock([mockExtrinsic]);

      const mockCapacityEvent = {
        phase: { isApplyExtrinsic: true, asApplyExtrinsic: { eq: (idx: number) => true} },
        event: {
          section: 'capacity',
          method: 'CapacityWithdrawn',
          data: { amount: { toBigInt: () => 1000n } },
        },
      };

      const mockEventsObject = {
        capacity: { CapacityWithdrawn: { is: jest.fn().mockReturnValue(true) } },
        system: { ExtrinsicFailed: { is: jest.fn().mockReturnValue(false) } },
      };
      Object.defineProperty(blockchainRpcQueryService, 'events', { get: jest.fn().mockReturnValue(mockEventsObject) });

      jest.mocked(blockchainRpcQueryService.getCurrentCapacityEpoch).mockResolvedValue(1);
      jest.mocked(blockchainRpcQueryService.getCurrentEpochLength).mockResolvedValue(100);

      await service.processCurrentBlock(mockBlock, [mockCapacityEvent as any]);

      expect(blockchainRpcQueryService.getCurrentCapacityEpoch).toHaveBeenCalled();
      expect(cacheManager.get).toHaveBeenCalledWith('epochCapacity:1');
      expect(cacheManager.setex).toHaveBeenCalledWith('epochCapacity:1', expect.any(Number), '1000');
    });
  });
});
