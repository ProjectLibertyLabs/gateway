import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumberString, IsString, IsUrl } from 'class-validator';

export class WatchGraphsDto {
  @IsArray()
  @IsNumberString({ no_symbols: true }, { each: true })
  @IsNotEmpty()
  @ApiProperty({ description: 'MSA IDs for which to watch for graph updates', type: [String], example: ['2', '3', '4', '5'] })
  dsnpIds: string[];

  @IsNotEmpty()
  @IsString()
  @IsUrl({ require_tld: false })
  @ApiProperty({ description: 'Webhook URL to call when graph changes for the referenced MSAs are detected', type: String, example: 'http://localhost/webhook' })
  webhookEndpoint: string;
}
