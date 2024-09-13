// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsNotEmpty } from 'class-validator';
import { TransactionType } from '#account-lib';
import { RetireMsaPayloadResponseDto } from '#account-lib/types/dtos/accounts.response.dto';
import { HexString } from '@polkadot/util/types';

export class RetireMsaRequestDto extends RetireMsaPayloadResponseDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsHexadecimal()
  signature: HexString;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  accountId: string;
}

export type PublishRetireMsaRequestDto = RetireMsaRequestDto & {
  type: TransactionType.RETIRE_MSA;
};
