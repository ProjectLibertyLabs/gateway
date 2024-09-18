// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class MsaIdDto {
  @ApiProperty({ name: 'msaId', type: String, description: 'Msa Id of requested account', example: '2' })
  @IsMsaId({ message: 'Msa Id should be a valid positive number' })
  msaId: string;
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
