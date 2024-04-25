import { IsNotEmpty, IsOptional } from 'class-validator';

export class WalletLoginResponse {
  @IsNotEmpty()
  referenceId: string;

  @IsOptional()
  msaId?: string;

  @IsOptional()
  publicKey?: string;
}
