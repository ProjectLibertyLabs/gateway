import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class WalletV2RedirectResponseDto {
  @ApiProperty({
    description: 'The base64url encoded JSON stringified signed request.',
    required: true,
    type: String,
  })
  @IsNotEmpty()
  signedRequest: string;

  @ApiProperty({
    description: 'A publically available Frequency node for SIWF dApps to connect to the correct chain.',
    required: true,
    type: String,
  })
  @IsNotEmpty()
  frequencyRpcUrl: string;

  @ApiProperty({
    description: 'The compiled redirect url with all the parameters already built in.',
    required: true,
    type: String,
  })
  @IsNotEmpty()
  redirectUrl: string;
}
