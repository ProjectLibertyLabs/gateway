/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { IsHexValue } from '#utils/decorators';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';

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
  @ApiProperty({
    type: String,
    description: 'Hex-encoded representation of the "RetireMsa" extrinsic',
    example: '0x1234',
  })
  @IsHexValue({ minLength: 2 })
  encodedExtrinsic: HexString;

  @ApiProperty({
    type: String,
    description: 'payload to be signed',
    example: '0x1234',
  })
  @IsHexValue({ minLength: 2 })
  payloadToSign: HexString;

  @ApiProperty({
    type: String,
    description: 'AccountId in hex or SS58 format',
    example: '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N',
  })
  @IsAccountIdOrAddress()
  accountId: string;
}
