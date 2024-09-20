/* eslint-disable max-classes-per-file */
import {
  EncodedExtrinsic,
  ErrorResponse,
  SignInResponse,
  SignUpResponse,
  SiwsPayload,
  ValidSignUpPayloads,
  type WalletProxyResponse,
} from '@projectlibertylabs/siwf';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#types/enums/account-enums';
import { IsHexValue } from '#utils/decorators';
import { Type } from 'class-transformer';
import { IsSignature } from '#utils/decorators/is-signature.decorator';

export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty({
    type: String,
    description: 'Error message',
    example: 'Some error',
  })
  @IsNotEmpty()
  message: string;
}
export class SiwsPayloadDto implements SiwsPayload {
  @ApiProperty()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    type: String,
    description: 'Signature of the payload',
    example:
      '0x64f8dd8846ba72cbb1954761ec4b2e44b886abb4b4ef7455b869355f17b4ce4a601ad26eabc57a682244a97bc9a2001b59469ae76fea105b724e988967d4928d',
  })
  @IsSignature()
  signature: string | HexString;
}
export class SignInResponseDto implements SignInResponse {
  @ApiPropertyOptional({ type: SiwsPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SiwsPayloadDto)
  siwsPayload?: SiwsPayloadDto | undefined;

  @ApiPropertyOptional({ type: ErrorResponseDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorResponseDto)
  error?: ErrorResponseDto | undefined;
}

export class EncodedExtrinsicDto implements EncodedExtrinsic {
  @ApiProperty()
  @MinLength(1)
  @IsString()
  pallet: string;

  @ApiProperty()
  @MinLength(1)
  @IsString()
  extrinsicName: string;

  @ApiProperty({
    type: String,
    description: 'Hex-encoded representation of the extrinsic',
    example: '0x00112233',
  })
  @IsHexValue({ minLength: 2 })
  encodedExtrinsic: string | HexString;
}

export class SignUpResponseDto implements SignUpResponse {
  @IsOptional()
  @ApiPropertyOptional({ type: [EncodedExtrinsicDto] })
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => EncodedExtrinsicDto)
  extrinsics?: EncodedExtrinsicDto[] | undefined;

  @IsOptional()
  @ApiPropertyOptional({ type: ErrorResponseDto })
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
  signIn: SignInResponseDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SignUpResponseDto)
  signUp: SignUpResponseDto;
}

export type PublishSIWFSignupRequestDto = ValidSignUpPayloads & {
  type: TransactionType.SIWF_SIGNUP;
};
