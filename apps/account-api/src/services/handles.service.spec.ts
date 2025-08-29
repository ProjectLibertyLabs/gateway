import { HandlePayloadDto, HandleRequestDto } from '#types/dtos/account';
import {
  createClaimHandlePayload,
  createRandomKey as createRandomEthereumKey,
  sign as signEthereum,
} from '@frequency-chain/ethereum-utils';
import { Test } from '@nestjs/testing';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { buildBlockchainConfigProvider, mockAccountApiConfigProvider } from '#testlib/configProviders.mock.spec';
import { jest } from '@jest/globals';
import { HandlesService } from '#account-api/services/handles.service';
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';

jest.mock<typeof import('#blockchain/blockchain-rpc-query.service')>('#blockchain/blockchain-rpc-query.service');
jest.mock<typeof import('#account-lib/services/enqueue-request.service')>(
  '#account-lib/services/enqueue-request.service',
);

describe('HandlesService', () => {
  let handlesService: HandlesService;

  beforeAll(async () => {
    const mockBlockchainConfigProvider = buildBlockchainConfigProvider('Sr25519');
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRoot(getPinoHttpOptions())],
      providers: [
        HandlesService,
        BlockchainRpcQueryService,
        mockBlockchainConfigProvider,
        mockAccountApiConfigProvider,
      ],
    }).compile();

    handlesService = moduleRef.get(HandlesService);
  });
  it('verifyHandleRequestSignature works with ethereum keys', async () => {
    // @ts-ignore
    const keyPair = createRandomEthereumKey();

    const handleKeyData = createClaimHandlePayload('Howdy Doody', 100);
    const handleKeyDataPayload: HandlePayloadDto = {
      baseHandle: handleKeyData.handle,
      expiration: handleKeyData.expiration,
    };

    const ethereumSignature = await signEthereum(keyPair.privateKey, handleKeyData, 'Dev');
    const payload: HandleRequestDto = {
      accountId: keyPair.address.ethereumAddress,
      payload: handleKeyDataPayload,
      proof: ethereumSignature.Ecdsa,
    };
    expect(handlesService.verifyHandleRequestSignature(payload)).toBeTruthy();
  });
});
