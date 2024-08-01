// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '../enums';

class KeysRequestPayload {
  @ApiProperty()
  @IsNotEmpty()
  msaId: string;

  @ApiProperty()
  @IsNotEmpty()
  expiration: number;

  @ApiProperty()
  @IsNotEmpty()
  newPublicKey: string;
}

export class KeysRequest {
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

export type AddKeyRequest = KeysRequest & {
  type: TransactionType.ADD_KEY;
};

export type PublishKeysRequest = AddKeyRequest;
