import {
  AddNewPublicKeyAgreementRequestDto,
  ItemActionDto,
  ItemActionType,
  ItemizedSignaturePayloadDto,
  KeysRequestDto,
  KeysRequestPayloadDto,
} from '#types/dtos/account';
import {
  AddItemizedAction,
  createAddKeyData,
  createItemizedSignaturePayloadV2,
  getUnifiedPublicKey,
  sign as signEthereum,
} from '@frequency-chain/ethereum-utils';
import { u8aToHex } from '@polkadot/util';
import { KeysService } from '#account-api/services/keys.service';
import { Test } from '@nestjs/testing';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { buildBlockchainConfigProvider, mockAccountApiConfigProvider } from '#testlib/configProviders.mock.spec';
import { jest } from '@jest/globals';
import { HexString } from '@polkadot/util/types';
import { createKeys } from '#testlib/keys.spec';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { isHexStr } from '@projectlibertylabs/siwf';

jest.mock<typeof import('#blockchain/blockchain-rpc-query.service')>('#blockchain/blockchain-rpc-query.service');
jest.mock<typeof import('#account-lib/services/enqueue-request.service')>(
  '#account-lib/services/enqueue-request.service',
);

const createItemizedAddAction = (data: HexString | Uint8Array): AddItemizedAction => {
  const parsedData: HexString = typeof data === 'object' ? u8aToHex(data) : data;
  expect(isHexStr(parsedData)).toBeTruthy();
  return { actionType: 'Add', data, index: 0 } as AddItemizedAction;
};

describe('KeysService', () => {
  let keysService: KeysService;

  beforeEach(async () => {
    await cryptoWaitReady();
    const mockBlockchainConfigProvider = buildBlockchainConfigProvider('Sr25519');
    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [KeysService, BlockchainRpcQueryService, mockBlockchainConfigProvider, mockAccountApiConfigProvider],
    }).compile();

    keysService = moduleRef.get(KeysService);
  });

  describe('Dtos', () => {
    it('KeysRequest Dtos accept ethereum keys', () => {
      const { keyringPair: ethKeyringPair } = createKeys('ethereum');
      const { keyringPair: sr25529KeyPair } = createKeys();
      const addKeyData = createAddKeyData('1', getUnifiedPublicKey(ethKeyringPair), 100);
      const keysRequestPayload: KeysRequestPayloadDto = {
        ...addKeyData,
      };
      expect(keysRequestPayload).toBeDefined();
      const keysRequest: KeysRequestDto = {
        msaOwnerAddress: sr25529KeyPair.address,
        msaOwnerSignature: '0x12345677890',
        payload: addKeyData,
        newKeyOwnerSignature: '0x0987654321',
      };
      expect(keysRequest).toBeDefined();
    });
  });

  describe('verifyOneAddKeyignature', () => {
    it('works for ethereum unified key', async () => {
      const { keyringPair, keypair } = createKeys('ethereum');
      const ethAddr = keyringPair.address as HexString;

      const ethereumPublicKey = u8aToHex(getUnifiedPublicKey(keyringPair));
      const addKeyData1 = createAddKeyData('1', ethereumPublicKey, 100);
      const keysRequestPayload1: KeysRequestPayloadDto = {
        ...addKeyData1,
      };

      const ethereumSignature1 = await signEthereum(u8aToHex(keypair.secretKey), addKeyData1, 'Dev');
      expect(
        keysService.verifyOneAddKeySignature(ethAddr, ethereumSignature1.Ecdsa, keysRequestPayload1).isValid,
      ).toBeTruthy();
    });
  });
  describe('verifyPublicKeyAgreementSignature', () => {
    it('works for ethereum unified key', async () => {
      const { keyringPair, keypair } = createKeys('ethereum');
      const ethAddr = keyringPair.address as HexString;

      const addItem = createItemizedAddAction('0x4444');
      const addItemDto: ItemActionDto = {
        ...addItem,
        type: ItemActionType.ADD_ITEM,
      };

      const addItemActionsData = createItemizedSignaturePayloadV2(64, 92187389, 199, [addItem]);
      const addItemActionsPayload: ItemizedSignaturePayloadDto = {
        schemaId: addItemActionsData.schemaId,
        targetHash: addItemActionsData.targetHash,
        expiration: addItemActionsData.expiration,
        actions: [addItemDto],
      };

      const ethereumSignature = await signEthereum(u8aToHex(keypair.secretKey), addItemActionsData, 'Dev');

      const payload: AddNewPublicKeyAgreementRequestDto = {
        accountId: ethAddr,
        payload: addItemActionsPayload,
        proof: ethereumSignature.Ecdsa,
      };

      expect(keysService.verifyPublicKeyAgreementSignature(payload)).toBeTruthy();
    });
  });
});
