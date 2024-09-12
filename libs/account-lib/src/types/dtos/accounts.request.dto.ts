// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { SignerPayloadJSON, SignerResult, ISubmittableResult } from '@polkadot/types/types';
import { H256 } from '@polkadot/types/interfaces';
import { TransactionType } from '#account-lib';

export class SignerPayloadRaw {
  address: string;

  data: string;

  type: 'payload' | 'bytes';
}

export class Signer {
  signPayload?: (payload: SignerPayloadJSON) => Promise<SignerResult>;

  signRaw?: (raw: SignerPayloadRaw) => Promise<SignerResult>;

  update?: (id: number, status: H256 | ISubmittableResult) => void;
}

export class RetireMsaRequestDto {
  @ApiProperty({ type: SignerPayloadRaw })
  @IsNotEmpty()
  signerPayload: SignerPayloadRaw;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  encodedPayload: string;

  @ApiProperty({ type: Object })
  @IsNotEmpty()
  signer: Signer;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  accountId: string;
}

export type PublishRetireMsaRequestDto = RetireMsaRequestDto & {
  type: TransactionType.RETIRE_MSA;
};
