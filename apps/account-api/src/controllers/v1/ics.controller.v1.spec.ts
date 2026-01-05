import { IcsControllerV1 } from '#account-api/controllers';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { PinoLogger } from 'nestjs-pino';
import { AccountsService } from '#account-api/services';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { IAccountApiConfig } from '#account-api/api.config';
import { MsaIdDto } from '#types/dtos/common';
import { IcsPublishAllRequestDto } from '#types/dtos/account';

describe('IcsController', () => {
  const goodAccountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

  let blockchainService: BlockchainRpcQueryService;
  let enqueueService: EnqueueService;

  const testApiConfig: IAccountApiConfig = {
    apiBodyJsonLimit: '',
    apiPort: 0,
    apiTimeoutMs: 0,
    graphEnvironmentType: undefined,
    siwfUrl: '',
  };

  const testBlockchainConfig = {
    capacityLimit: undefined,
    frequencyApiWsUrl: undefined,
    frequencyTimeoutSecs: 0,
    isDeployedReadOnly: false,
    providerId: 0n,
    providerKeyUriOrPrivateKey: '',
  };

  const logger: PinoLogger = new PinoLogger({});

  let icsController: IcsControllerV1;
  let accountsService: AccountsService;

  beforeEach(() => {
    accountsService = new AccountsService(
      testApiConfig,
      testBlockchainConfig,
      blockchainService,
      enqueueService,
      logger,
    );

    blockchainService = new BlockchainRpcQueryService(testBlockchainConfig, null, logger);

    icsController = new IcsControllerV1(blockchainService, enqueueService, accountsService, logger);
  });

  describe('basic', () => {
    it('calls getMsaIdForAccountId', async () => {
      const testMsaId: MsaIdDto = { msaId: '123' };

      const goodTestPayload: IcsPublishAllRequestDto = {
        addIcsPublicKeyPayload: {
          accountId: goodAccountId,
          payload: { schemaId: 1234, actions: [], expiration: 1, targetHash: 2 },
          proof: '0x1234567890abcdef',
        },
        addContentGroupMetadataPayload: {
          pageId: 0,
          accountId: goodAccountId,
          payload: { schemaId: 1234, actions: [], expiration: 1, targetHash: 2 },
          proof: '0x1234567890abcdef',
        },
        addContextGroupPRIDEntryPayload: {
          accountId: goodAccountId,
          payload: { schemaId: 1234, actions: [], expiration: 1, targetHash: 2 },
          proof: '0x1234567890abcdef',
        },
      };

      jest.spyOn(accountsService, 'getMsaIdForAccountId').mockImplementation(async () => testMsaId);
      expect(await icsController.publishAll({ accountId: goodAccountId }, goodTestPayload)).not.toBe(404);
    });
  });
});
