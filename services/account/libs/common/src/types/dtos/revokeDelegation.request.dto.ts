/* eslint-disable max-classes-per-file */
import { IsNotEmpty } from 'class-validator';
import { CommonPrimitivesMsaDelegation } from '@polkadot/types/lookup';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '../enums';

class RevokeDelegationPayloadDto {
  @ApiProperty()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty()
  @IsNotEmpty()
  expiration: number;
}

export class RevokeDelegationRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty()
  @IsNotEmpty()
  payload: RevokeDelegationPayloadDto;

  @ApiProperty()
  @IsNotEmpty()
  proof: HexString;
}
export class RevokeDelegationPayloadRequest {
  @ApiProperty()
  @IsNotEmpty()
  payload: RevokeDelegationRequestDto['payload'];

  @ApiProperty()
  @IsNotEmpty()
  encodedPayload: HexString;
}

export type RevokeDelegationRequest = RevokeDelegationRequestDto & {
  type: TransactionType.REVOKE_DELEGATION;
};
