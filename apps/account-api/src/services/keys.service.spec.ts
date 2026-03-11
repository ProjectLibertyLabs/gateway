import {
  AddNewPublicKeyAgreementRequestDto,
  ItemActionDto,
  ItemActionType,
  ItemizedSignaturePayloadDto,
  KeysRequestDto,
  KeysRequestPayloadDto,
} from '#types/dtos/account';
import {
  createAddKeyData,
  createItemizedAddAction,
  createItemizedDeleteAction,
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
import { LoggerModule } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';
import { mockRedisProvider } from '#testlib';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { useContainer } from 'class-validator';
import Keyring from '@polkadot/keyring';
import { ItemizedStoragePageResponse } from '@frequency-chain/api-augment/interfaces';
import { Vec } from '@polkadot/types';
import IcsApi from '@projectlibertylabs-ics/ics-sdk';
const icsSdk: IcsApi = new IcsApi();

jest.mock<typeof import('#blockchain/blockchain-rpc-query.service')>('#blockchain/blockchain-rpc-query.service');
jest.mock<typeof import('#account-lib/services/enqueue-request.service')>(
  '#account-lib/services/enqueue-request.service',
);

describe('KeysService', () => {
  let keysService: KeysService;
  let blockchainRpcQueryService: BlockchainRpcQueryService;

  beforeAll(async () => {
    await cryptoWaitReady();
    const mockBlockchainConfigProvider = buildBlockchainConfigProvider('Sr25519');
    const moduleRef = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot(getPinoHttpOptions()),
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
      providers: [
        KeysService,
        BlockchainRpcQueryService,
        mockBlockchainConfigProvider,
        mockAccountApiConfigProvider,
        mockRedisProvider(),
      ],
    }).compile();

    // Important: point class-validator at Nest’s container for this test run
    useContainer(moduleRef, { fallbackOnErrors: true });

    keysService = moduleRef.get(KeysService);
    blockchainRpcQueryService = moduleRef.get(BlockchainRpcQueryService);
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
        encodedPayload: addItem.data,
        type: ItemActionType.ADD_ITEM,
      };

      const deleteItem = createItemizedDeleteAction(1);
      const deleteItemDto: ItemActionDto = {
        ...deleteItem,
        type: ItemActionType.DELETE_ITEM,
      };

      const itemActionsData = createItemizedSignaturePayloadV2(64, 92187389, 199, [addItem, deleteItem]);
      const addItemActionsPayload: ItemizedSignaturePayloadDto = {
        schemaId: itemActionsData.schemaId,
        targetHash: itemActionsData.targetHash,
        expiration: itemActionsData.expiration,
        actions: [addItemDto, deleteItemDto],
      };

      const ethereumSignature = await signEthereum(u8aToHex(keypair.secretKey), itemActionsData, 'Dev');

      const payload: AddNewPublicKeyAgreementRequestDto = {
        accountId: ethAddr,
        payload: addItemActionsPayload,
        proof: ethereumSignature.Ecdsa,
      };

      expect(keysService.verifyPublicKeyAgreementSignature(payload)).toBeTruthy();
    });
  });
  describe('getAddIcsPublicKeyAgreementPayload', () => {
    let keyring = new Keyring({ type: 'ed25519' });

    let createItemizedSignaturePayloadSpy;
    const msaId = '1234';
    const seed = new Uint8Array(32).fill(1);
    const newKeypair = keyring.addFromSeed(seed);

    const mockItemizedStorageResponse = (returnItems: Array<any>): ItemizedStoragePageResponse => {
      return {
        items: { toArray: () => returnItems as any as Vec<any> },
        content_hash: { toNumber: () => 5 },
      } as unknown as ItemizedStoragePageResponse;
    };

    beforeEach(async () => {
      jest.spyOn(blockchainRpcQueryService, 'getLatestSchemaIdForIntent').mockResolvedValueOnce(16299);
      jest.spyOn(blockchainRpcQueryService, 'getLatestBlockNumber').mockResolvedValueOnce(300_000);
      createItemizedSignaturePayloadSpy = jest
        .spyOn(blockchainRpcQueryService, 'createItemizedSignaturePayloadV2Type')
        .mockReturnValueOnce({
          toU8a: () => Uint8Array.from([1, 2, 3]),
        });
    });
    afterEach(() => jest.restoreAllMocks());

    it('throws when the key is malformed', async () => {
      jest.spyOn(blockchainRpcQueryService, 'isValidMsaId').mockResolvedValueOnce(true);
      const badKey = '0xdeadabeef' as HexString;
      await expect(() => keysService.getAddIcsPublicKeyAgreementPayload(msaId, badKey)).rejects.toThrow(
        'ed25519 public key should be 32 bytes',
      );
    });

    it('throws when the msaId does not exist', async () => {
      jest.spyOn(blockchainRpcQueryService, 'isValidMsaId').mockResolvedValueOnce(false);
      await expect(() =>
        keysService.getAddIcsPublicKeyAgreementPayload(msaId, `0x${newKeypair.address}`)
      ).rejects.toThrow('MSA ID 1234 not found');
    });

    it('throws when the ICS key is already registered', async () => {
      const newKey = newKeypair.publicKey;
      const icsSerializedKey = icsSdk.serializePublicKey(newKey);
      const mockPayload = [{ payload: icsSerializedKey }];
      const mockResponse = mockItemizedStorageResponse(mockPayload);

      jest.spyOn(blockchainRpcQueryService, 'getItemizedStorage').mockResolvedValueOnce(mockResponse);
      jest.spyOn(blockchainRpcQueryService, 'isValidMsaId').mockResolvedValueOnce(true);

      await expect(() =>
        keysService.getAddIcsPublicKeyAgreementPayload(msaId, u8aToHex(newKeypair.publicKey)),
      ).rejects.toThrow('Requested key already exists!');
    });

    it('returns a payload when provided valid parameters', async () => {
      const mockResponse = mockItemizedStorageResponse([]);
      jest.spyOn(blockchainRpcQueryService, 'getItemizedStorage').mockResolvedValueOnce(mockResponse);
      jest.spyOn(blockchainRpcQueryService, 'isValidMsaId').mockResolvedValueOnce(true);

      const result = await keysService.getAddIcsPublicKeyAgreementPayload(msaId, u8aToHex(newKeypair.publicKey));
      expect(result.encodedPayload).toEqual('0x010203');
      expect(result.payload).toBeDefined();
      expect(createItemizedSignaturePayloadSpy).toHaveBeenCalled();
    });
  });
});
