 
import { IsNotEmpty, IsOptional } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { IsHexValue } from '#utils/decorators';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';

export class HandleResponseDto {
  base_handle: string;

  canonical_base: string;

  suffix: number;
}

export class AccountResponseDto {
  @IsNotEmpty()
  msaId: string;

  @IsOptional()
  handle?: HandleResponseDto;
}

export class MsaIdResponseDto {
  @IsNotEmpty()
  msaId: string;
}

export class RetireMsaPayloadResponseDto {
  /**
   * Hex-encoded representation of the "RetireMsa" extrinsic
   * @example '0x1234'
   */
  @IsHexValue({ minLength: 2 })
  encodedExtrinsic: HexString;

  /**
   * payload to be signed
   * @example '0x1234'
   */
  @IsHexValue({ minLength: 2 })
  payloadToSign: HexString;

  /**
   * AccountId in hex or SS58 format
   * @example '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N'
   */
  @IsAccountIdOrAddress()
  accountId: string;
}
