/* eslint-disable max-classes-per-file */
import { EncodedExtrinsic } from '@amplica-labs/siwf';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { TransactionType } from '../enums';

export class WalletLoginResponseDTO {
  @IsNotEmpty()
  accessToken: string;

  @IsNotEmpty()
  expires: number;

  @IsOptional()
  referenceId?: string;

  @IsOptional()
  msaId?: string;

  // @IsNotEmpty()
  // handle: string;
}

export class SIWFSignupRequest {
  calls: EncodedExtrinsic[];
  publicKey: string;
  type: TransactionType.SIWF_SIGNUP;
}
