import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, ValidateIf } from 'class-validator';

export class WalletV2LoginRequestDto {
  @ApiPropertyOptional({
    description:
      'The code returned from the SIWF v2 Authentication service that can be exchanged for the payload. Required unless an `authorizationPayload` is provided.',
    type: String,
    example: 'TODO',
  })
  @ValidateIf((o) => !o.authorizationPayload)
  @IsNotEmpty()
  authorizationCode?: string;

  @ApiPropertyOptional({
    description:
      'The SIWF v2 Authentication payload as a JSON stringified and base64url encoded value. Required unless an `authorizationCode` is provided.',
    type: String,
    example: 'TODO',
  })
  @ValidateIf((o) => !o.authorizationCode)
  @IsNotEmpty()
  authorizationPayload?: string;
}
