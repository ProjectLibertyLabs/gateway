import { describe, it, jest, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainRpcQueryService } from './blockchain-rpc-query.service';
import { noProviderBlockchainConfig, IBlockchainNonProviderConfig } from './blockchain.config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { mockApiPromise } from '#testlib/polkadot-api.mock.spec';
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { RpcCall } from './decorators/rpc-call.decorator';
import {
  CustomError,
  TestService,
  TestServiceWithError,
  TestServiceWithCustomError,
  TestServiceWithNonError,
  TestServiceWithoutLogger,
} from './blockchain-rpc-query.spec.helper';

jest.mock('@polkadot/api', () => {
  const originalModule = jest.requireActual<typeof import('@polkadot/api')>('@polkadot/api');
  return {
    __esModules: true,
    WsProvider: jest.fn().mockImplementation(() => ({
      disconnect: jest.fn(),
      ...originalModule.WsProvider,
    })),
    ApiPromise: jest.fn().mockImplementation(() => ({
      consts: {},
      disconnect: jest.fn(),
      ...originalModule.ApiPromise,
      ...mockApiPromise,
    })),
  };
});

const mockNoProviderConfigProvider = GenerateMockConfigProvider<IBlockchainNonProviderConfig>(
  noProviderBlockchainConfig.KEY,
  {
    frequencyTimeoutSecs: 10,
    frequencyApiWsUrl: new URL('ws://localhost:9944'),
    isDeployedReadOnly: false,
  },
);


describe('BlockchainRpcQueryService - RpcCall Decorator', () => {
  let service: BlockchainRpcQueryService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
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
      providers: [BlockchainRpcQueryService, mockNoProviderConfigProvider],
    }).compile();

    service = moduleRef.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);

    // Emit connected event to unblock the connection wait
    const mockApi: any = await service.getApi();
    mockApi.emit('connected');
  }, 10000);

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('@RpcCall decorator', () => {
    it('should return the result of a successful RPC call', async () => {
      const testService = new TestService();
      const result = await testService.testMethod();

      expect(result).toEqual({ data: 'test-data' });
    });

    it('should log error and enhance error message on RPC failure', async () => {
      const testService = new TestServiceWithError();

      await expect(testService.testMethod()).rejects.toThrow('[rpc.test.method] Original error message');

      expect(testService.logger.error).toHaveBeenCalledWith(
        {
          rpcMethod: 'rpc.test.method',
          errorMessage: 'Original error message',
          errorName: 'Error',
        },
        'RPC call failed: rpc.test.method',
      );
    });

    it('should preserve error type when enhancing error message', async () => {
      const testService = new TestServiceWithCustomError();

      try {
        await testService.testMethod();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.name).toBe('CustomError');
        expect(error.message).toContain('[rpc.test.method]');
        expect(error.message).toContain('Custom error');
      }
    });

    it('should handle non-Error objects thrown by RPC calls', async () => {
      const testService = new TestServiceWithNonError();

      await expect(testService.testMethod()).rejects.toThrow('Server error');

      expect(testService.logger.error).toHaveBeenCalledWith(
        {
          rpcMethod: 'rpc.test.method',
          errorMessage: 'Server error',
          errorName: 'Error',
        },
        'RPC call failed: rpc.test.method',
      );
    });

    it('should work without logger', async () => {
      const testService = new TestServiceWithoutLogger();

      await expect(testService.testMethod()).rejects.toThrow('[rpc.test.method] Test error');
    });
  });

  describe('Integration with actual RPC methods', () => {
    it('should wrap getBlockHash RPC call and enhance errors', async () => {
      const mockApi: any = await service.getApi();
      const originalError = new Error('Connection timeout');
      jest.spyOn(mockApi.rpc.chain, 'getBlockHash').mockRejectedValueOnce(originalError);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await expect(service.getBlockHash(1)).rejects.toThrow('[rpc.chain.getBlockHash] Connection timeout');

      expect(loggerSpy).toHaveBeenCalledWith(
        {
          rpcMethod: 'rpc.chain.getBlockHash',
          errorMessage: 'Connection timeout',
          errorName: 'Error',
        },
        'RPC call failed: rpc.chain.getBlockHash',
      );
    });

    it('should wrap getNonce RPC call and enhance errors', async () => {
      const mockApi: any = await service.getApi();
      const originalError = new Error('Account not found');
      jest.spyOn(mockApi.rpc.system, 'accountNextIndex').mockRejectedValueOnce(originalError);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await expect(service.getNonce('test-account')).rejects.toThrow('[rpc.system.accountNextIndex] Account not found');

      expect(loggerSpy).toHaveBeenCalledWith(
        {
          rpcMethod: 'rpc.system.accountNextIndex',
          errorMessage: 'Account not found',
          errorName: 'Error',
        },
        'RPC call failed: rpc.system.accountNextIndex',
      );
    });
  });
});
