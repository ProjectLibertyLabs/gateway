/* eslint-disable max-classes-per-file */
import { EncodedExtrinsic } from '@amplica-labs/siwf';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { TransactionType } from '../enums';

export class WalletLoginResponse {
  @IsNotEmpty()
  referenceId: string;

  @IsOptional()
  msaId?: string;

  @IsOptional()
  publicKey?: string;
}

export type SignUpResponse = WalletLoginResponse & {
  type: TransactionType.SIWF_SIGNUP;
};

export class SIWFSignupRequest {
  calls: EncodedExtrinsic[];

  publicKey: string;

  type: TransactionType.SIWF_SIGNUP;
}
