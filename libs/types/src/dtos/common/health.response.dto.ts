/* eslint-disable max-classes-per-file */
import { IsNotEmpty, IsRFC3339 } from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { ContentPublishingApiConfigDto } from '../content-publishing';

// TODO: Expand for other config types
type ServiceConfigDto = ContentPublishingApiConfigDto;

export class QueueStatusDto {
  name: string;

  @ApiProperty({
    description: 'Status of Queue',
    example: 'Queue is running',
  })
  status: string;

  isPaused: boolean | null;
}

class LatestBlockHeader {
  blockHash: string;

  number: number;

  parentHash: string;
}

export class BlockchainStatusDto {
  latestBlockHeader: LatestBlockHeader | null;
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Status of health response',
    example: 200,
    enum: HttpStatus,
    enumName: 'HttpStatus',
  })
  status: HttpStatus;

  @IsNotEmpty()
  message: string;

  @IsRFC3339()
  timestamp: number;

  config: ServiceConfigDto;

  queueStatus: QueueStatusDto[];

  blockchainStatus: BlockchainStatusDto;
}
