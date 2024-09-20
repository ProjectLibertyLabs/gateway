// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsNotEmpty } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { RetireMsaPayloadResponseDto } from './accounts.response.dto';
import { TransactionType } from '#types/account-webhook';

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
