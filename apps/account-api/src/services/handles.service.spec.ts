import { HandlePayloadDto, HandleRequestDto } from '#types/dtos/account';
import { createClaimHandlePayload, sign as signEthereum } from '@frequency-chain/ethereum-utils';
import { u8aToHex } from '@polkadot/util';
import { Test } from '@nestjs/testing';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { buildBlockchainConfigProvider, mockAccountApiConfigProvider } from '#testlib/configProviders.mock.spec';
import { jest } from '@jest/globals';
import { HexString } from '@polkadot/util/types';
import { HandlesService } from '#account-api/services/handles.service';
import { createKeys } from '#testlib/keys.spec';

jest.mock<typeof import('#blockchain/blockchain-rpc-query.service')>('#blockchain/blockchain-rpc-query.service');
jest.mock<typeof import('#account-lib/services/enqueue-request.service')>(
  '#account-lib/services/enqueue-request.service',
);

describe('HandlesService', () => {
  let handlesService: HandlesService;

  beforeAll(async () => {
    const mockBlockchainConfigProvider = buildBlockchainConfigProvider('Sr25519');
    const moduleRef = await Test.createTestingModule({
      imports: [],
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
    const { keyringPair, keypair } = createKeys('ethereum');
    const ethAddr = keyringPair.address as HexString;

    const handleKeyData = createClaimHandlePayload('Howdy Doody', 100);
    const handleKeyDataPayload: HandlePayloadDto = {
      baseHandle: handleKeyData.handle,
      expiration: handleKeyData.expiration,
    };

    const ethereumSignature = await signEthereum(u8aToHex(keypair.secretKey), handleKeyData, 'Dev');
    const payload: HandleRequestDto = {
      accountId: ethAddr,
      payload: handleKeyDataPayload,
      proof: ethereumSignature.Ecdsa,
    };
    expect(handlesService.verifyHandleRequestSignature(payload)).toBeTruthy();
  });
});
