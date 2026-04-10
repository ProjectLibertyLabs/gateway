import { describe, it, jest, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainRpcQueryService } from './blockchain-rpc-query.service';
import { noProviderBlockchainConfig, IBlockchainReadOnlyConfig } from './blockchain.config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { mockApiPromise } from '#testlib/polkadot-api.mock.spec';
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';
import { GenerateMockConfigProvider } from '#testlib/utils.config-tests';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';

jest.mock('@polkadot/api', () => {
  const originalModule = jest.requireActual<typeof import('@polkadot/api')>('@polkadot/api');
  return {
    __esModules: true,
    WsProvider: jest.fn().mockImplementation(() => ({
      ...originalModule.WsProvider,
      disconnect: jest.fn(),
    })),
    ApiPromise: jest.fn().mockImplementation(() => ({
      ...originalModule.ApiPromise,
      ...mockApiPromise,
      consts: {},
      disconnect: jest.fn(),
    })),
  };
});

const mockNoProviderConfigProvider = GenerateMockConfigProvider<IBlockchainReadOnlyConfig>(
  noProviderBlockchainConfig.KEY,
  {
    frequencyTimeoutSecs: 10,
    frequencyApiWsUrl: new URL('ws://localhost:9944'),
    isDeployedReadOnly: false,
    providerId: 989n,
  },
);

describe('BlockchainRpcQueryService - handleSIWFTxnResult', () => {
  let service: BlockchainRpcQueryService;
  let moduleRef: TestingModule;
  let mockApi: any;
  const providerId = '989';
  const handle = 'test_handle';
  const address = '5FHneW46xzh26me6QR9m4GS9uF67y9iA8zWHFDRy(random)';
  const msaId = '100';
  const baseHandle = 'fallback_handle';
  const suffix = '123';

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
    mockApi = await service.getApi();
    mockApi.emit('connected');

    // Setup basic api mock for events
    mockApi.events = {
      msa: {
        MsaCreated: { is: jest.fn() },
        DelegationGranted: { is: jest.fn() },
      },
      handles: {
        HandleClaimed: { is: jest.fn() },
      },
    };
  }, 10000);

  afterEach(async () => {
    await moduleRef.close();
  });

  const createMockEvent = (eventData: any) =>
    ({
      event: {
        data: eventData,
      },
    }) as unknown as FrameSystemEventRecord;

  it('handles all events present in the transaction result', async () => {
    const events = [
      createMockEvent({ msaId: { toString: () => msaId }, key: { toString: () => address } }),
      createMockEvent({
        msaId: { toString: () => msaId },
        handle: { toString: () => `0x${Buffer.from(handle).toString('hex')}` },
      }),
      createMockEvent({ delegatorId: { toString: () => msaId }, providerId: { toString: () => providerId } }),
    ];

    // set up sequence of all accepted types of events.
    mockApi.events.msa.MsaCreated.is.mockImplementation((e: any) => e === events[0].event);
    mockApi.events.handles.HandleClaimed.is.mockImplementation((e: any) => e === events[1].event);
    mockApi.events.msa.DelegationGranted.is.mockImplementation((e: any) => e === events[2].event);

    const result = await service.handleSIWFTxnResult(events);

    expect(result).toEqual({
      msaId,
      address,
      handle,
      newProvider: providerId,
    });
  });

  it('handles missing MsaCreated event by using fallbacks', async () => {
    const events = [
      createMockEvent({
        msaId: { toString: () => msaId },
        handle: { toString: () => `0x${Buffer.from(handle).toString('hex')}` },
      }),
      createMockEvent({ delegatorId: { toString: () => msaId }, providerId: { toString: () => providerId } }),
    ];

    mockApi.events.msa.MsaCreated.is.mockReturnValue(false);
    mockApi.events.handles.HandleClaimed.is.mockImplementation((e: any) => e === events[0].event);
    mockApi.events.msa.DelegationGranted.is.mockImplementation((e: any) => e === events[1].event);

    jest.spyOn(service, 'getKeysByMsa').mockResolvedValue({
      msa_keys: [address],
    } as any);

    const result = await service.handleSIWFTxnResult(events);

    expect(result).toEqual({
      msaId,
      address,
      handle,
      newProvider: providerId,
    });
    expect(service.getKeysByMsa).toHaveBeenCalledWith(msaId);
  });

  it('should handle missing HandleClaimed event by using getHandleForMsa fallback', async () => {
    const events = [
      createMockEvent({ msaId: { toString: () => msaId }, key: { toString: () => address } }),
      createMockEvent({ delegatorId: { toString: () => msaId }, providerId: { toString: () => providerId } }),
    ];

    mockApi.events.msa.MsaCreated.is.mockImplementation((e: any) => e === events[0].event);
    mockApi.events.handles.HandleClaimed.is.mockReturnValue(false);
    mockApi.events.msa.DelegationGranted.is.mockImplementation((e: any) => e === events[1].event);

    jest.spyOn(service, 'getHandleForMsa').mockResolvedValue({
      base_handle: baseHandle,
      suffix: suffix,
    } as any);

    const result = await service.handleSIWFTxnResult(events);

    expect(result).toEqual({
      msaId,
      address,
      handle: `${baseHandle}.${suffix}`,
      newProvider: providerId,
    });
    expect(service.getHandleForMsa).toHaveBeenCalledWith(msaId);
  });

  it('should handle missing DelegationGranted event by using providerId fallback', async () => {
    const events = [
      createMockEvent({ msaId: { toString: () => msaId }, key: { toString: () => address } }),
      createMockEvent({
        msaId: { toString: () => msaId },
        handle: { toString: () => `0x${Buffer.from(handle).toString('hex')}` },
      }),
    ];

    mockApi.events.msa.MsaCreated.is.mockImplementation((e: any) => e === events[0].event);
    mockApi.events.handles.HandleClaimed.is.mockImplementation((e: any) => e === events[1].event);
    mockApi.events.msa.DelegationGranted.is.mockReturnValue(false);

    const result = await service.handleSIWFTxnResult(events);

    expect(result).toEqual({
      msaId,
      address,
      handle,
      newProvider: '989', // From mockNoProviderConfigProvider
    });
  });

  it('should handle msaId being set from HandleClaimed if MsaCreated is missing', async () => {
    const events = [
      createMockEvent({
        msaId: { toString: () => msaId },
        handle: { toString: () => `0x${Buffer.from(handle).toString('hex')}` },
      }),
    ];

    mockApi.events.msa.MsaCreated.is.mockReturnValue(false);
    mockApi.events.handles.HandleClaimed.is.mockImplementation((e: any) => e === events[0].event);
    mockApi.events.msa.DelegationGranted.is.mockReturnValue(false);

    jest.spyOn(service, 'getKeysByMsa').mockResolvedValue({
      msa_keys: [address],
    } as any);

    const result = await service.handleSIWFTxnResult(events);

    expect(result.msaId).toBe(msaId);
    expect(result.handle).toBe(handle);
  });

  it('handles msaId being set from DelegationGranted if others are missing', async () => {
    const events = [
      createMockEvent({ delegatorId: { toString: () => msaId }, providerId: { toString: () => providerId } }),
    ];

    mockApi.events.msa.MsaCreated.is.mockReturnValue(false);
    mockApi.events.handles.HandleClaimed.is.mockReturnValue(false);
    mockApi.events.msa.DelegationGranted.is.mockImplementation((e: any) => e === events[0].event);

    jest.spyOn(service, 'getKeysByMsa').mockResolvedValue({
      msa_keys: [address],
    } as any);
    jest.spyOn(service, 'getHandleForMsa').mockResolvedValue({
      base_handle: baseHandle,
      suffix: suffix,
    } as any);

    const result = await service.handleSIWFTxnResult(events);

    expect(result.msaId).toBe(msaId);
    expect(result.address).toBe(address);
    expect(result.handle).toBe(`${baseHandle}.${suffix}`);
    expect(result.newProvider).toBe(providerId);
  });
});
