import { IcsControllerV1 } from '#account-api/controllers';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { LoggerModule } from 'nestjs-pino';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getPinoHttpOptions } from '#logger-lib';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModuleMocker, MockMetadata } from 'jest-mock';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { HttpException } from '@nestjs/common';
import { createIcsPublishAllRequestDto } from '#testlib/payloadDtos.spec';

const moduleMocker = new ModuleMocker(global);
const mockSubmittableExtrinsic = (result: string) => {
  return {
    toHex: jest.fn().mockImplementation(() => result),
  };
};

const mockApiPromise = {
  ...EventEmitter2.prototype,
  isReady: Promise.resolve(),
  tx: {
    statefulStorage: {
      applyItemActionsWithSignatureV2: jest.fn().mockImplementation(() => mockSubmittableExtrinsic('0x01020304')),
      upsertPageWithSignatureV2: jest.fn().mockImplementation(() => mockSubmittableExtrinsic('0x05060708')),
    },
  },
};

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

describe('IcsController', () => {
  let icsController: IcsControllerV1;
  let moduleRef: TestingModule;
  let blockchainRpcQueryService: BlockchainRpcQueryService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [IcsControllerV1],
      imports: [LoggerModule.forRoot(getPinoHttpOptions())],
    })
      .useMocker((token) => {
        if (token === BlockchainRpcQueryService) {
          return {
            getApi: () => mockApiPromise,
            publicKeyToMsaId: jest.fn(),
            createItemizedSignaturePayloadV2Type: jest.fn().mockImplementation(() => Uint8Array.from([1, 2, 3])),
          };
        }
        if (token === EnqueueService) {
          return {
            enqueueIcsBatch: jest.fn().mockImplementation(async () => {
              return Promise.resolve({ referenceId: 'referenceId' });
            }),
          };
        }
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata) as ObjectConstructor;
          return new Mock();
        }
        return undefined;
      })
      .compile();

    icsController = moduleRef.get<IcsControllerV1>(IcsControllerV1);
    blockchainRpcQueryService = moduleRef.get<BlockchainRpcQueryService>(BlockchainRpcQueryService);
  });

  describe('basic', () => {
    const goodAccountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const mockIcsPublishAllPayload = createIcsPublishAllRequestDto('0x1234');
    it('calls getMsaIdForAccountId', async () => {
      const spy = jest.spyOn(blockchainRpcQueryService, 'publicKeyToMsaId').mockResolvedValueOnce('123');
      const result = await icsController.publishAll({ accountId: goodAccountId }, mockIcsPublishAllPayload);
      expect(spy).toHaveBeenCalledWith(goodAccountId);
      expect(result.referenceId).toBe('referenceId');
    });
    it('throws HttpEception when the account has no MsaId', async () => {
      const spy = jest.spyOn(blockchainRpcQueryService, 'publicKeyToMsaId').mockResolvedValueOnce(null);
      await expect(icsController.publishAll({ accountId: goodAccountId }, mockIcsPublishAllPayload)).rejects.toThrow(
        HttpException,
      );
      expect(spy).toHaveBeenCalledWith(goodAccountId);
    });
  });
});
