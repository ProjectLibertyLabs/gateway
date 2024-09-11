import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class WalletLoginResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  referenceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  msaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  publicKey?: string;
}
