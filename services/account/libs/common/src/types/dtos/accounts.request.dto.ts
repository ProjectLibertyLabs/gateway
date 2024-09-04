import { TransactionType } from '#lib/types/enums';
import { GenericExtrinsicPayload } from '@polkadot/types';
import { Signature } from '@polkadot/types/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class RetireMsaRequestDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  encodedPayload: GenericExtrinsicPayload;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  signature: Signature;

  @ApiProperty()
  @IsNotEmpty()
  accountId: string;
}

export type PublishRetireMsaRequestDto = RetireMsaRequestDto & {
  type: TransactionType.RETIRE_MSA;
};
