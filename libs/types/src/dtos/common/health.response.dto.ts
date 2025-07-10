/* eslint-disable max-classes-per-file */
import { IsNotEmpty, IsRFC3339 } from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({
    description: 'Configuration details - supplied by service',
    type: 'object',
    example: {
      apiBodyJsonLimit: '1mb',
      apiPort: 3000,
      apiTimeoutMs: 5000,
      // ...example of other config properties
    },
    additionalProperties: true,
  })
  config: unknown;

  redisStatus: RedisStatusDto;

  blockchainStatus: BlockchainStatusDto;
}
