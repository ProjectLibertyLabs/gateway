/* eslint-disable max-classes-per-file */
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#types/account-webhook';

export class RevokeDelegationPayloadResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty()
  @IsNotEmpty()
  encodedExtrinsic: HexString;

  @ApiProperty()
  @IsNotEmpty()
  payloadToSign: HexString;
}

export class RevokeDelegationPayloadRequestDto extends RevokeDelegationPayloadResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  signature: HexString;
}

export type PublishRevokeDelegationRequestDto = RevokeDelegationPayloadRequestDto & {
  type: TransactionType.REVOKE_DELEGATION;
};
