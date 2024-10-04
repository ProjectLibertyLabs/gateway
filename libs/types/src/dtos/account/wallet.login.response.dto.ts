import { IsNotEmpty, IsOptional } from 'class-validator';

export class WalletLoginResponseDto {
  @IsNotEmpty()
  referenceId: string;

  @IsOptional()
  msaId?: string;

  @IsOptional()
  publicKey?: string;
}
