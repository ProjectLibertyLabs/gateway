import {
  AddNewPublicKeyAgreementRequestDto,
  IcsPublishAllRequestDto,
  ItemActionDto,
  ItemizedSignaturePayloadDto,
  UpsertPagePayloadDto,
} from '#types/dtos/account';
import { createItemizedAddAction } from '@frequency-chain/ethereum-utils';
import { ItemActionType } from '#types/enums';
import { HexString } from '@polkadot/util/types';

// Alice account on Testnet Paseo
const goodAccountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

// payload signature when signed by Alice account
const validProof =
  '0x9c66050e827d24862d77f398095dfe59fabcea3cf768ce4fbd5aa74e65d6be27db1e87f56e9c8484a230d405989a89ecaebcdabe95a1c307a4c736cf85444e85';

export function createAddItemActionDto(data: HexString): ItemActionDto {
  const addItem = createItemizedAddAction(data);
  const dto = new ItemActionDto();
  dto.type = ItemActionType.ADD_ITEM;
  dto.encodedPayload = addItem.data;
  return dto
}

export function createDeleteItemActionDto(): ItemActionDto {
  const dto = new ItemActionDto();
  dto.type = ItemActionType.DELETE_ITEM;
  dto.index = 1;
  return dto;
}

export function createItemizedSignaturePayloadDto(data: HexString): ItemizedSignaturePayloadDto {
  const dto = new ItemizedSignaturePayloadDto();
  dto.schemaId = 1234;
  dto.actions = [
    createAddItemActionDto(data),
    createDeleteItemActionDto()
  ];
  dto.expiration = 1;
  dto.targetHash = 2;
  return dto;
}

export function createAddNewPublicKeyAgreementRequestDto(accountId: string): AddNewPublicKeyAgreementRequestDto {
  const dto = new AddNewPublicKeyAgreementRequestDto();
  dto.accountId = accountId;
  dto.payload = createItemizedSignaturePayloadDto('0x3434');
  dto.proof = validProof;
  return dto;
}


export function createUpsertPagePayloadDto(accountId: string): UpsertPagePayloadDto {
  const dto = new UpsertPagePayloadDto();
  dto.accountId = accountId;
  dto.payload = createItemizedSignaturePayloadDto('0x3434');
  dto.proof = validProof;
  dto.pageId = 1;
  return dto;
}

export function createIcsPublishAllRequestDto(accountId?: string): IcsPublishAllRequestDto {
  const dto = new IcsPublishAllRequestDto();
  dto.addIcsPublicKeyPayload = createAddNewPublicKeyAgreementRequestDto(accountId || goodAccountId);
  dto.addContextGroupPRIDEntryPayload = createAddNewPublicKeyAgreementRequestDto(accountId || goodAccountId);
  dto.addContentGroupMetadataPayload = createUpsertPagePayloadDto(accountId || goodAccountId);
  return dto;
}
