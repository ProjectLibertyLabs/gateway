/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexadecimal, IsNotEmpty, IsOptional } from 'class-validator';
import { HexString } from '@polkadot/util/types';

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
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsHexadecimal()
  encodedExtrinsic: HexString;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsHexadecimal()
  payloadToSign: HexString;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  accountId: string;
}
