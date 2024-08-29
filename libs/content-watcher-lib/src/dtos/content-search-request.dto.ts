import { IsInt, IsOptional, IsPositive, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChainWatchOptionsDto } from './chain.watch.dto';

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
  @IsPositive()
  @ApiProperty({
    description: 'The block number to search (backward) from',
    required: false,
    example: 100,
  })
  startBlock: number;

  @IsInt()
  @IsPositive()
  @ApiProperty({
    description: 'The number of blocks to scan (backwards)',
    required: true,
    example: 101,
  })
  blockCount: number;

  @IsOptional()
  @ApiProperty({
    description: 'The schemaIds/dsnpIds to filter by',
    required: false,
  })
  filters: ChainWatchOptionsDto;

  @IsUrl({ require_tld: false })
  @ApiProperty({
    description: 'A webhook URL to be notified of the results of this search',
    required: true,
  })
  webhookUrl: string;
}
