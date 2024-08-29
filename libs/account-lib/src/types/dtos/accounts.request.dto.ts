import { TransactionType } from '#lib/types/enums';
import { ExtrinsicPayload, Signature } from '@polkadot/types/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { SignerPayloadJSON } from '@polkadot/types/types';

export class RetireMsaRequestDto {
  @ApiProperty({ type: Object })
  @IsNotEmpty()
  unsignedPayload: SignerPayloadJSON;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  encodedPayload: ExtrinsicPayload;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  signature: string;

  @ApiProperty()
  @IsNotEmpty()
  accountId: string;
}

export type PublishRetireMsaRequestDto = RetireMsaRequestDto & {
  type: TransactionType.RETIRE_MSA;
};
