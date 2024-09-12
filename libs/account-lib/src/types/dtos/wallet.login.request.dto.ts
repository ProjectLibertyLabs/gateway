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
import {ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested} from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '../enums';
import {Type} from "class-transformer";
import {IsHexValue} from "#account-lib/utils/custom.decorator";
import {ItemActionDto, ItemizedSignaturePayloadDto} from "#account-lib/types/dtos/graphs.request.dto";

export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty()
  @IsNotEmpty()
  message: string;
}
export class SiwsPayloadDto implements SiwsPayload {
  @ApiProperty()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ type: String })
  @IsHexValue({ minLength: 128, maxLength: 128, message: 'signature should be a 64 bytes value in hex format!' })
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

  @ApiProperty({ type: String })
  @IsHexValue({ minLength: 2, message: 'encodedExtrinsic should be in valid hex format!' })
  encodedExtrinsic: string | HexString;
}

export class SignUpResponseDto implements SignUpResponse {
  @IsOptional()
  @ApiPropertyOptional({ type: [EncodedExtrinsicDto] })
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayNotEmpty()
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
        signature: '0x1234567890abcdef',
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
