// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, MinLength } from 'class-validator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';

export class MsaIdDto {
  @ApiProperty({ name: 'msaId', type: String, description: 'Msa Id of requested account', example: '2' })
  @IsMsaId()
  msaId: string;
}

export class ProviderMsaIdDto {
  @ApiProperty({ name: 'providerId', type: String, description: 'Msa Id of provider', example: '1' })
  @IsMsaId()
  providerId: string;
}

export class UrlDto {
  @ApiProperty({
    name: 'url',
    type: 'string',
    example: 'http://localhost/webhook',
    description: 'URL related to the request',
  })
  @IsNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  url: string;
}

export class HandleDto {
  @ApiProperty({
    description: 'newHandle in the request',
    type: String,
    example: 'handle',
  })
  @MinLength(3)
  @IsString()
  newHandle: string;
}

export class AccountIdDto {
  @ApiProperty({
    type: String,
    description: 'AccountId in hex or SS58 format',
    example: '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N',
  })
  @IsAccountIdOrAddress()
  accountId: string;
}
