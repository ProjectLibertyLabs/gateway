// eslint-disable-next-line max-classes-per-file
import { KeyInfoResponse } from '@frequency-chain/api-augment/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '../enums';

class KeysRequestPayload {
  @ApiProperty()
  @IsNotEmpty()
  msaId: number;

  @ApiProperty()
  @IsNotEmpty()
  expiration: number;

  @ApiProperty()
  @IsNotEmpty()
  newPublicKey: string;
}

export class AddKeysRequest {
  @ApiProperty()
  @IsNotEmpty()
  msaOwnerAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  msaOwnerSignature: HexString;

  @ApiProperty()
  @IsNotEmpty()
  newKeyOwnerSignature: HexString;

  @ApiProperty()
  @IsNotEmpty()
  payload: KeysRequestPayload;
}

export type AddKeysTxRequest = AddKeysRequest & {
  type: TransactionType.ADD_KEY;
};

export class DeleteKeysRequest {
  @ApiProperty()
  @IsNotEmpty()
  key: string;
}

export type PublishKeysRequest = AddKeysTxRequest;

export type KeysResponse = KeyInfoResponse['msa_keys'];
