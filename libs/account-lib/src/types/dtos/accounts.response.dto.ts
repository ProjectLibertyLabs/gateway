/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { SignerPayloadRaw } from './accounts.request.dto';

export class HandleResponseDto {
  @ApiProperty()
  base_handle: string;

  @ApiProperty()
  canonical_base: string;

  @ApiProperty()
  suffix: number;
}

export class AccountResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  msaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  handle?: HandleResponseDto;
}

export class MsaIdResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  msaId: string;
}

export class RetireMsaPayloadResponseDto {
  @ApiProperty({ type: SignerPayloadRaw })
  @IsNotEmpty()
  signerPayload: SignerPayloadRaw;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  encodedPayload: string;
}
