import { EnsureArray } from '#utils/decorators/ensure-array.decorator';
import { IsCredentialType } from '#utils/decorators/is-credential-type.decorator';
import { IsSchemaName } from '#utils/decorators/is-schema-name.decorator';
import { IsSwifV2CallbackUrl } from '#utils/decorators/is-swif-v2-callback-url.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class WalletV2RedirectRequestDto {
  @ApiProperty({
    description: 'The URL that will be called when the authentication process is completed.',
    required: true,
    type: String,
  })
  @IsSwifV2CallbackUrl()
  callbackUrl: string;

  @ApiProperty({
    description:
      'List of credentials using the types: "VerifiedGraphKeyCredential", "VerifiedEmailAddressCredential", and "VerifiedPhoneNumberCredential". Note that Contact related verifiable credentials will be nested into an anyOf request form.',
    required: false,
    type: [String],
  })
  @IsOptional()
  @EnsureArray
  @IsCredentialType({ each: true })
  credentials?: string[];

  @ApiProperty({
    description:
      'The list of permissions using the Frequency Schema names and versions. Pattern: `<namespace>.<name>@v<version integer>` e.g. `dsnp.broadcast@v2`',
    required: false,
    type: [String],
  })
  @IsOptional()
  @EnsureArray
  @IsSchemaName({ each: true })
  permissions?: string[];
}
