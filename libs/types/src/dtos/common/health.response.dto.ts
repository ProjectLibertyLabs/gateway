/* eslint-disable max-classes-per-file */
import { IsNotEmpty, IsRFC3339 } from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { AccountApiConfigDto } from '../account';
import { ContentPublishingApiConfigDto } from '../content-publishing';
import { ContentWatcherApiConfigDto } from '../content-watcher';
import { GraphApiConfigDto } from '../graph';

type ServiceConfigDto =
  | AccountApiConfigDto
  | ContentPublishingApiConfigDto
  | ContentWatcherApiConfigDto
  | GraphApiConfigDto;

export class QueueStatusDto {
  name: string;

  waiting: number;

  active: number;

  completed: number;

  failed: number;

  delayed: number;
}

export class RedisStatusDto {
  redis_version: string;

  used_memory: number;

  maxmemory: number;

  uptime_in_seconds: number;

  connected_clients: number;

  queues: QueueStatusDto[];
}

export class LatestBlockHeader {
  blockHash: string;

  number: number;

  parentHash: string;
}

export class BlockchainStatusDto {
  frequencyApiWsUrl: string;

  siwfNodeRpcUrl: string;

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

  redisStatus: RedisStatusDto;

  blockchainStatus: BlockchainStatusDto;
}
