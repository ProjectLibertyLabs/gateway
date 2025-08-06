/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-extraneous-dependencies */
import { describe, it, jest, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService, NONCE_SERVICE_REDIS_NAMESPACE } from './blockchain.service';
import { IBlockchainConfig } from './blockchain.config';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { CommonPrimitivesMsaProviderRegistryEntry } from '@polkadot/types/lookup';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { getRedisToken } from '@songkeys/nestjs-redis';
import { Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { mockApiPromise } from '#testlib/polkadot-api.mock.spec';
import { NonceConflictError } from '#blockchain/types';

function createNamedError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

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

const mockBlockchainConfigProvider = GenerateMockConfigProvider<IBlockchainConfig>('blockchain', {
  capacityLimit: { serviceLimit: { type: 'percentage', value: 80n } },
  providerId: 1n,
  providerKeyUriOrPrivateKey: '//Alice',
  frequencyTimeoutSecs: 10,
  frequencyApiWsUrl: new URL('ws://localhost:9944'),
  isDeployedReadOnly: false,
});

const mockDefaultRedisProvider: Provider = {
  provide: getRedisToken('default'),
  useValue: {},
};

const mockNonceRedisProvider: Provider = {
  provide: getRedisToken(NONCE_SERVICE_REDIS_NAMESPACE),
  useValue: {
    defineCommand: jest.fn(),
    get: jest.fn(),
  },
};

describe('BlockchainService', () => {
  let mockApi: any;
  let blockchainService: BlockchainService;
  let blockchainConf: IBlockchainConfig;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // const foo = await import('@polkadot/api');
    // console.log(foo);
    moduleRef = await Test.createTestingModule({
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
      ],
      controllers: [],
      providers: [BlockchainService, mockBlockchainConfigProvider, mockNonceRedisProvider, mockDefaultRedisProvider],
    }).compile();

    moduleRef.enableShutdownHooks();

    blockchainService = moduleRef.get<BlockchainService>(BlockchainService);
    mockApi = await blockchainService.getApi();
    blockchainConf = moduleRef.get<IBlockchainConfig>(mockBlockchainConfigProvider.provide);

    await cryptoWaitReady();
    mockApi.emit('connected'); // keeps the test suite from hanging when finished
  });

  afterAll(async () => {
    moduleRef.close();
  });

  describe('getCurrentCapacityEpochStart', () => {
    it('should return the current capacity epoch start', async () => {
      // Arrange
      const expectedEpochStart = { toNumber: jest.fn(() => 23) };
      const currentEpochInfo = { epochStart: expectedEpochStart };

      jest.spyOn(mockApi.query.capacity, 'currentEpochInfo').mockResolvedValue(currentEpochInfo);

      // Act
      const result = await blockchainService.getCurrentCapacityEpochStart();

      // Assert
      expect(result).toBe(expectedEpochStart.toNumber());
    });
  });

  describe('validateproviderKeyUriOrPrivateKey', () => {
    beforeAll(() => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValue('1');
      jest
        .spyOn(blockchainService, 'getProviderToRegistryEntry')
        .mockResolvedValue({} as CommonPrimitivesMsaProviderRegistryEntry);
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should not throw if seed phrase is correct for provider', async () => {
      await expect(blockchainService.validateproviderKeyUriOrPrivateKey()).resolves.not.toThrow();
    });

    it('should not throw if no seed phrase configured (read-only mode)', async () => {
      jest.spyOn(blockchainConf, 'providerKeyUriOrPrivateKey', 'get').mockReturnValueOnce(undefined);
      await expect(blockchainService.validateproviderKeyUriOrPrivateKey()).resolves.not.toThrow();
    });

    it('should throw if seed phrase if for a different provider', async () => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValueOnce('2');
      await expect(blockchainService.validateproviderKeyUriOrPrivateKey()).rejects.toThrow();
    });

    it('should throw if seed phrase does not map to an MSA', async () => {
      jest.spyOn(blockchainService, 'publicKeyToMsaId').mockResolvedValueOnce(null);
      await expect(blockchainService.validateproviderKeyUriOrPrivateKey()).rejects.toThrow();
    });

    it('should throw if provided ID and seed phrase do not map to a registered provider', async () => {
      jest.spyOn(blockchainService, 'getProviderToRegistryEntry').mockResolvedValueOnce(null);
      await expect(blockchainService.validateproviderKeyUriOrPrivateKey()).rejects.toThrow();
    });
  });

  describe('getNetworkType', () => {
    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should return mainnet for the mainnet hash', () => {
      jest
        .spyOn(mockApi.genesisHash, 'toHex')
        .mockReturnValue('0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1');
      expect(blockchainService.getNetworkType()).toEqual('mainnet');
      expect(blockchainService.chainType).toEqual('Mainnet-Frequency');
    });

    it('should return testnet for the testnet hash', () => {
      jest
        .spyOn(mockApi.genesisHash, 'toHex')
        .mockReturnValue('0x203c6838fc78ea3660a2f298a58d859519c72a5efdc0f194abd6f0d5ce1838e0');
      expect(blockchainService.getNetworkType()).toEqual('testnet-paseo');
      expect(blockchainService.chainType).toEqual('Paseo-Testnet-Frequency');
    });

    it('should return unknown for anything else', () => {
      jest.spyOn(mockApi.genesisHash, 'toHex').mockReturnValue('0xabcd');
      expect(blockchainService.getNetworkType()).toEqual('unknown');
      expect(blockchainService.chainType).toEqual('Dev');
    });
  });

  describe('payWithCapacity', () => {
    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should not unreserve nonce if rejection was due to nonce conflict', async () => {
      const unreserveSpy = jest.spyOn(blockchainService, 'unreserveNonce');
      jest.spyOn(mockApiPromise.tx.frequencyTxPayment, 'payWithCapacity').mockReturnValueOnce({
        toHuman: () => {},
        signAndSend: () => Promise.reject(createNamedError('RpcError', 'Priority is too low')),
      });
      jest.spyOn(blockchainService, 'reserveNextNonce').mockResolvedValueOnce(1);
      jest
        .spyOn(blockchainService, 'getBlockForSigning')
        .mockResolvedValueOnce({ number: 1, blockHash: '0xabcd', parentHash: '0x1234' });
      await expect(() => blockchainService.payWithCapacity('foo')).rejects.toThrow(NonceConflictError);
      expect(unreserveSpy).not.toHaveBeenCalled();
    });

    it('should unreserve nonce if rejection was due to other than nonce conflict', async () => {
      const unreserveSpy = jest.spyOn(blockchainService, 'unreserveNonce');
      jest.spyOn(blockchainService, 'reserveNextNonce').mockResolvedValue(1);
      jest
        .spyOn(blockchainService, 'getBlockForSigning')
        .mockResolvedValue({ number: 1, blockHash: '0xabcd', parentHash: '0x1234' });

      // Test with RpcError (but not NonceConflict)
      jest.spyOn(mockApiPromise.tx.frequencyTxPayment, 'payWithCapacity').mockReturnValueOnce({
        toHuman: () => {},
        signAndSend: () => Promise.reject(createNamedError('RpcError', 'Some other error')),
      });
      await expect(() => blockchainService.payWithCapacity('foo')).rejects.toThrow();
      expect(unreserveSpy).toHaveBeenCalled();

      // Test with non-RpcError
      jest.spyOn(mockApiPromise.tx.frequencyTxPayment, 'payWithCapacity').mockReturnValueOnce({
        toHuman: () => {},
        signAndSend: () => Promise.reject(new Error('Non-RpcError')),
      });
      await expect(() => blockchainService.payWithCapacity('foo')).rejects.toThrow();
      expect(unreserveSpy).toHaveBeenCalled();
    });
  });

  describe('payWithCapacityBatchAll', () => {
    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should not unreserve nonce if rejection was due to nonce conflict', async () => {
      const unreserveSpy = jest.spyOn(blockchainService, 'unreserveNonce');
      jest.spyOn(mockApiPromise.tx.frequencyTxPayment, 'payWithCapacityBatchAll').mockReturnValueOnce({
        toHuman: () => {},
        signAndSend: () => Promise.reject(createNamedError('RpcError', 'Priority is too low')),
      });
      jest.spyOn(blockchainService, 'reserveNextNonce').mockResolvedValueOnce(1);
      jest
        .spyOn(blockchainService, 'getBlockForSigning')
        .mockResolvedValueOnce({ number: 1, blockHash: '0xabcd', parentHash: '0x1234' });
      await expect(() => blockchainService.payWithCapacityBatchAll([])).rejects.toThrow(NonceConflictError);
      expect(unreserveSpy).not.toHaveBeenCalled();
    });

    it('should unreserve nonce if rejection was due to other than nonce conflict', async () => {
      const unreserveSpy = jest.spyOn(blockchainService, 'unreserveNonce');
      jest.spyOn(blockchainService, 'reserveNextNonce').mockResolvedValueOnce(1);
      jest
        .spyOn(blockchainService, 'getBlockForSigning')
        .mockResolvedValueOnce({ number: 1, blockHash: '0xabcd', parentHash: '0x1234' });

      // Test with RpcError (but not NonceConflict)
      jest.spyOn(mockApiPromise.tx.frequencyTxPayment, 'payWithCapacityBatchAll').mockReturnValueOnce({
        toHuman: () => {},
        signAndSend: () => Promise.reject(createNamedError('RpcError', 'Some other error')),
      });
      await expect(() => blockchainService.payWithCapacityBatchAll([])).rejects.toThrow();
      expect(unreserveSpy).toHaveBeenCalled();

      // Test with non-RpcError
      jest.spyOn(mockApiPromise.tx.frequencyTxPayment, 'payWithCapacityBatchAll').mockReturnValueOnce({
        toHuman: () => {},
        signAndSend: () => Promise.reject(new Error('Non-RpcError')),
      });
      await expect(() => blockchainService.payWithCapacityBatchAll([])).rejects.toThrow();
      expect(unreserveSpy).toHaveBeenCalled();
    });
  });
});
