/* eslint-disable max-classes-per-file */
import {
  EncodedExtrinsic,
  ErrorResponse,
  SignInResponse,
  SignUpResponse,
  SiwsPayload,
  type WalletProxyResponse,
} from '@projectlibertylabs/siwfv1';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { IsHexValue } from '#utils/decorators';
import { Type } from 'class-transformer';
import { IsSignature } from '#utils/decorators/is-signature.decorator';

export class ErrorResponseDto implements ErrorResponse {
  /**
   * Error message
   * @example 'Some error'
   */
  @IsNotEmpty()
  message: string;
}
export class SiwsPayloadDto implements SiwsPayload {
  @IsNotEmpty()
  message: string;

  /**
   * Signature of the payload
   * @example '0x64f8dd8846ba72cbb1954761ec4b2e44b886abb4b4ef7455b869355f17b4ce4a601ad26eabc57a682244a97bc9a2001b59469ae76fea105b724e988967d4928d'
   */
  @IsSignature()
  signature: string | HexString;
}
export class SignInResponseDto implements SignInResponse {
  @IsOptional()
  @ValidateNested()
  @Type(() => SiwsPayloadDto)
  siwsPayload?: SiwsPayloadDto | undefined;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorResponseDto)
  error?: ErrorResponseDto | undefined;
}

export class EncodedExtrinsicDto implements EncodedExtrinsic {
  @MinLength(1)
  @IsString()
  pallet: string;

  @MinLength(1)
  @IsString()
  extrinsicName: string;

  /**
   * Hex-encoded representation of the extrinsic
   * @example '0x00112233'
   */
  @IsHexValue({ minLength: 2 })
  encodedExtrinsic: string | HexString;
}

export class SignUpResponseDto implements SignUpResponse {
  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => EncodedExtrinsicDto)
  extrinsics?: EncodedExtrinsicDto[] | undefined;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorResponseDto)
  error?: ErrorResponseDto | undefined;
}

export class WalletLoginRequestDto implements WalletProxyResponse {
  @ApiPropertyOptional({
    description: 'The wallet login request information',
    example: {
      siwsPayload: {
        message: '0x1234567890abcdef',
        signature:
          '0x64f8dd8846ba72cbb1954761ec4b2e44b886abb4b4ef7455b869355f17b4ce4a601ad26eabc57a682244a97bc9a2001b59469ae76fea105b724e988967d4928d',
      },
      err: {
        message: 'Error message',
      },
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SignInResponseDto)
  signIn?: SignInResponseDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SignUpResponseDto)
  signUp?: SignUpResponseDto;
}
