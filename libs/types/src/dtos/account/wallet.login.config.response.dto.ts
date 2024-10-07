import { IsNotEmpty } from 'class-validator';

export class WalletLoginConfigResponseDto {
  @IsNotEmpty()
  providerId: string;

  @IsNotEmpty()
  siwfUrl: string;

  @IsNotEmpty()
  frequencyRpcUrl: string;
}
