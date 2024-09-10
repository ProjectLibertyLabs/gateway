// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#types/enums/account-enums';

class KeysRequestPayloadDto {
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

export class KeysRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  msaOwnerAddress: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  msaOwnerSignature: HexString;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  newKeyOwnerSignature: HexString;

  @ApiProperty()
  @IsNotEmpty()
  payload: KeysRequestPayloadDto;
}

export type AddKeyRequestDto = KeysRequestDto & {
  type: TransactionType.ADD_KEY;
};

export type PublishKeysRequestDto = AddKeyRequestDto;
