// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import {IsInt, IsNotEmpty, IsNumberString, Max, Min, ValidateNested} from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '../enums';
import {IsHexValue} from "#account-lib/utils/custom.decorator";
import {Type} from "class-transformer";

class KeysRequestPayloadDto {
  @ApiProperty({ type: String, description: 'MSA Id of account' })
  @IsNumberString( { no_symbols: true })
  @IsNotEmpty()
  msaId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  expiration: number;

  @ApiProperty({ type: String, description: 'newPublicKey in hex format' })
  @IsHexValue({ minLength: 64, maxLength: 64, message: 'newPublicKey should be a 32 bytes value in hex format!' })
  newPublicKey: string;
}

export class KeysRequestDto {
  @ApiProperty({ type: String, description: 'msaOwnerAddress in hex format' })
  @IsHexValue({ minLength: 64, maxLength: 64, message: 'msaOwnerAddress should be a 32 bytes value in hex format!' })
  msaOwnerAddress: string;

  @ApiProperty({ type: String })
  @IsHexValue({ minLength: 128, maxLength: 128, message: 'msaOwnerSignature should be a 64 bytes value in hex format!' })
  msaOwnerSignature: HexString;

  @ApiProperty({ type: String })
  @IsHexValue({ minLength: 128, maxLength: 128, message: 'newKeyOwnerSignature should be a 64 bytes value in hex format!' })
  newKeyOwnerSignature: HexString;

  @ApiProperty()
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => KeysRequestPayloadDto)
  payload: KeysRequestPayloadDto;
}

export type AddKeyRequestDto = KeysRequestDto & {
  type: TransactionType.ADD_KEY;
};

export type PublishKeysRequestDto = AddKeyRequestDto;
