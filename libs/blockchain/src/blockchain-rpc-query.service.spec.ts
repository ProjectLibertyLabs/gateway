import { describe, it, jest, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainRpcQueryService } from './blockchain-rpc-query.service';
import { noProviderBlockchainConfig, IBlockchainNonProviderConfig } from './blockchain.config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { mockApiPromise } from '#testlib/polkadot-api.mock.spec';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';

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

describe('BlockchainRpcQueryService - wrapRpcCall', () => {
  let service: BlockchainRpcQueryService;
  let moduleRef: TestingModule;

  beforeEach(
    async () => {
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
    },
    10000,
  );

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('wrapRpcCall', () => {
    it('should return the result of a successful RPC call', async () => {
      const expectedResult = { data: 'test-data' };
      const mockRpcCall = jest.fn<() => Promise<any>>().mockResolvedValue(expectedResult);

      const result = await (service as any).wrapRpcCall('rpc.test.method', mockRpcCall);

      expect(result).toEqual(expectedResult);
      expect(mockRpcCall).toHaveBeenCalledTimes(1);
    });

    it('should log error and enhance error message on RPC failure', async () => {
      const originalError = new Error('Original error message');
      const mockRpcCall = jest.fn<() => Promise<any>>().mockRejectedValue(originalError);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await expect((service as any).wrapRpcCall('rpc.test.method', mockRpcCall)).rejects.toThrow(
        '[rpc.test.method] Original error message',
      );

      expect(loggerSpy).toHaveBeenCalledWith('RPC call failed: rpc.test.method', 'Original error message');
      expect(mockRpcCall).toHaveBeenCalledTimes(1);
    });

    it('should preserve error type when enhancing error message', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const originalError = new CustomError('Custom error');
      const mockRpcCall = jest.fn<() => Promise<any>>().mockRejectedValue(originalError);

      try {
        await (service as any).wrapRpcCall('rpc.test.method', mockRpcCall);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.name).toBe('CustomError');
        expect(error.message).toContain('[rpc.test.method]');
        expect(error.message).toContain('Custom error');
      }
    });

    it('should handle non-Error objects thrown by RPC calls', async () => {
      const nonErrorObject = { code: 500, message: 'Server error' };
      const mockRpcCall = jest.fn<() => Promise<any>>().mockRejectedValue(nonErrorObject);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await expect((service as any).wrapRpcCall('rpc.test.method', mockRpcCall)).rejects.toEqual(nonErrorObject);

      expect(loggerSpy).toHaveBeenCalledWith('RPC call failed: rpc.test.method', 'Server error');
    });

    it('should handle RPC calls that reject with undefined or null', async () => {
      const mockRpcCall = jest.fn<() => Promise<any>>().mockRejectedValue(undefined);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await expect((service as any).wrapRpcCall('rpc.test.method', mockRpcCall)).rejects.toBeUndefined();

      expect(loggerSpy).toHaveBeenCalledWith('RPC call failed: rpc.test.method', undefined);
    });
  });

  describe('Integration with actual RPC methods', () => {
    it('should wrap getBlockHash RPC call and enhance errors', async () => {
      const mockApi: any = await service.getApi();
      const originalError = new Error('Connection timeout');
      jest.spyOn(mockApi.rpc.chain, 'getBlockHash').mockRejectedValueOnce(originalError);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await expect(service.getBlockHash(1)).rejects.toThrow('[rpc.chain.getBlockHash] Connection timeout');

      expect(loggerSpy).toHaveBeenCalledWith('RPC call failed: rpc.chain.getBlockHash', 'Connection timeout');
    });

    it('should wrap getNonce RPC call and enhance errors', async () => {
      const mockApi: any = await service.getApi();
      const originalError = new Error('Account not found');
      jest.spyOn(mockApi.rpc.system, 'accountNextIndex').mockRejectedValueOnce(originalError);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await expect(service.getNonce('test-account')).rejects.toThrow(
        '[rpc.system.accountNextIndex] Account not found',
      );

      expect(loggerSpy).toHaveBeenCalledWith('RPC call failed: rpc.system.accountNextIndex', 'Account not found');
    });
  });
});

