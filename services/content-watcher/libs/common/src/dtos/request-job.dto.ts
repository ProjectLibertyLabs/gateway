import { IsArray, IsOptional, IsString } from 'class-validator';
import { IChainWatchOptionsDto } from './chain.watch.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ContentSearchRequestDto {
  @IsOptional()
  @IsString()
  id: string;

  @IsString()
  @ApiProperty({
    description: 'The starting block number to search from',
    example: '100',
  })
  startBlock: string;

  @IsString()
  @ApiProperty({
    description: 'The ending block number to search to',
    example: '101',
  })
  endBlock: string;

  @IsOptional()
  filters: IChainWatchOptionsDto;
}
