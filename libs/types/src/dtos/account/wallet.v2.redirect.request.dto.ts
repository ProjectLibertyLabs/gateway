import { EnsureArray } from '#utils/decorators/ensure-array.decorator';
import { IsCredentialType } from '#utils/decorators/is-credential-type.decorator';
import { IsSchemaName } from '#utils/decorators/is-schema-name.decorator';
import { IsSwifV2CallbackUrl } from '#utils/decorators/is-swif-v2-callback-url.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class WalletV2RedirectRequestDto {
  /**
   * The URL that will be called when the authentication process is completed
   * @example 'http://localhost:3000/login/callback'
   */
  @IsSwifV2CallbackUrl()
  callbackUrl: string;

  @ApiPropertyOptional({
    description:
      'List of credentials using the types: "VerifiedGraphKeyCredential", "VerifiedEmailAddressCredential", and "VerifiedPhoneNumberCredential". Note that Contact related verifiable credentials will be nested into an anyOf request form.',
    type: [String],
    example: ['VerifiedGraphKeyCredential', 'VerifiedEmailAddressCredential', 'VerifiedPhoneNumberCredential'],
  })
  @IsOptional()
  @EnsureArray
  @IsCredentialType({ each: true })
  credentials?: string[];

  @ApiPropertyOptional({
    description:
      'The list of permissions using the Frequency Schema names and versions. Pattern: `<namespace>.<name>@v<version integer>` e.g. `dsnp.broadcast@v2`',
    type: [String],
    example: [
      'dsnp.broadcast@v2',
      'dsnp.private-follows@v1',
      'dsnp.reply@v2',
      'dsnp.reaction@v1',
      'dsnp.tombstone@v2',
      'dsnp.update@v2',
      'frequency.default-token-address@v1',
    ],
  })
  @IsOptional()
  @EnsureArray
  @IsSchemaName({ each: true })
  permissions?: string[];
}
