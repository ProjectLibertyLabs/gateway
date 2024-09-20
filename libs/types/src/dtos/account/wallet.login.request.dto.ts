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
import { IsOptional } from 'class-validator';
import { HexString } from '@polkadot/util/types';
import { TransactionType } from '#types/account-webhook';

export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty()
  message: string;
}
export class SiwsPayloadDto implements SiwsPayload {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: String })
  signature: string | HexString;
}
export class SignInResponseDto implements SignInResponse {
  @ApiPropertyOptional({ type: SiwsPayloadDto })
  @IsOptional()
  siwsPayload?: SiwsPayloadDto | undefined;

  @ApiPropertyOptional({ type: ErrorResponseDto })
  @IsOptional()
  error?: ErrorResponseDto | undefined;
}

export class EncodedExtrinsicDto implements EncodedExtrinsic {
  @ApiProperty()
  pallet: string;

  @ApiProperty()
  extrinsicName: string;

  @ApiProperty({ type: String })
  encodedExtrinsic: string | HexString;
}

export class SignUpResponseDto implements SignUpResponse {
  @IsOptional()
  @ApiPropertyOptional({ type: [EncodedExtrinsicDto] })
  extrinsics?: EncodedExtrinsicDto[] | undefined;

  @IsOptional()
  @ApiPropertyOptional({ type: ErrorResponseDto })
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
  signIn: SignInResponseDto;

  @ApiPropertyOptional()
  @IsOptional()
  signUp: SignUpResponseDto;
}

export type PublishSIWFSignupRequestDto = ValidSignUpPayloads & {
  type: TransactionType.SIWF_SIGNUP;
};
