import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChainWatchOptionsDto } from './chain.watch.dto';
import { Type } from 'class-transformer';

export class ContentSearchRequestDto {
  @ApiPropertyOptional({
    description: 'An optional client-supplied reference ID by which it can identify the result of this search',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientReferenceId: string;

  @ApiPropertyOptional({
    description: 'The block number to search (backward) from',
    required: false,
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  startBlock: number;

  @ApiProperty({
    description: 'The number of blocks to scan (backwards)',
    required: true,
    example: 101,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  blockCount: number;

  @ApiPropertyOptional({
    description: 'The schemaIds/dsnpIds to filter by',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChainWatchOptionsDto)
  filters: ChainWatchOptionsDto;

  @ApiProperty({
    description: 'A webhook URL to be notified of the results of this search',
    required: true,
    example: 'https://example.com',
  })
  @IsNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  webhookUrl: string;
}
