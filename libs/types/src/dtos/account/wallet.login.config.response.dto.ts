import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class WalletLoginConfigResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty()
  @IsNotEmpty()
  siwfUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  frequencyRpcUrl: string;
}
