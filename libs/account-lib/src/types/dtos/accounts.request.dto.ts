import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Signer, SignerPayloadRaw } from '@polkadot/types/types';
import { TransactionType } from '#account-lib';

export class RetireMsaRequestDto {
  @ApiProperty({ type: Object })
  @IsNotEmpty()
  signerPayload: SignerPayloadRaw;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  encodedPayload: string;

  @ApiProperty({ type: Object })
  @IsNotEmpty()
  signer: Signer;

  @ApiProperty()
  @IsNotEmpty()
  accountId: string;
}

export type PublishRetireMsaRequestDto = RetireMsaRequestDto & {
  type: TransactionType.RETIRE_MSA;
};
