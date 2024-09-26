import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChainWatchOptionsDto } from './chain.watch.dto';
import { Type } from 'class-transformer';

export class ContentSearchRequestDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'An optional client-supplied reference ID by which it can identify the result of this search',
    required: false,
  })
  clientReferenceId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  @ApiProperty({
    description: 'The block number to search (backward) from',
    required: false,
    example: 100,
  })
  startBlock: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  @ApiProperty({
    description: 'The number of blocks to scan (backwards)',
    required: true,
    example: 101,
  })
  blockCount: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChainWatchOptionsDto)
  @ApiProperty({
    description: 'The schemaIds/dsnpIds to filter by',
    required: false,
  })
  filters: ChainWatchOptionsDto;

  @IsNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  @ApiProperty({
    description: 'A webhook URL to be notified of the results of this search',
    required: true,
    example: 'https://example.com',
  })
  webhookUrl: string;
}
