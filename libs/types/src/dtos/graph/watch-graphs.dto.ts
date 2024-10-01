import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { IsMsaId } from '#utils/decorators/is-msa-id.decorator';

export class WatchGraphsDto {
  /**
   * MSA Ids for which to watch for graph updates
   * @example ['2', '3', '4', '5']
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMsaId({ each: true })
  dsnpIds?: string[];

  /**
   * Webhook URL to call when graph changes for the referenced MSAs are detected
   * @example 'http://localhost/webhook'
   */
  @IsNotEmpty()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  webhookEndpoint: string;
}
