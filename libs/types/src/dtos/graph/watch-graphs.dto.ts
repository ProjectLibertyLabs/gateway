import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class WatchGraphsDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMsaId({ each: true, message: 'dsnpId should be a valid positive number' })
  @ApiProperty({
    required: false,
    description: 'MSA Ids for which to watch for graph updates',
    type: [String],
    example: ['2', '3', '4', '5'],
  })
  dsnpIds?: string[];

  @IsNotEmpty()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  @ApiProperty({
    description: 'Webhook URL to call when graph changes for the referenced MSAs are detected',
    type: String,
    example: 'http://localhost/webhook',
  })
  webhookEndpoint: string;
}
