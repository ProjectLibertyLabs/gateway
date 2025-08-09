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

export class LoggingConfigDto {
  @ApiProperty({
    description: 'Log level',
    type: 'string',
    example: 'info',
    enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
  })
  logLevel: string;

  @ApiProperty({
    description: 'Whether logs are pretty-printed (true) or JSON (false)',
    type: 'boolean',
    example: true,
  })
  prettyPrint: boolean;
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
    description: 'Logging configuration details',
    type: 'object',
    example: {
      logLevel: 'info',
      prettyPrint: true,
    },
  })
  loggingConfig: LoggingConfigDto;

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

export class ReadinessResponseDto {
  @ApiProperty({
    description: 'Status of readiness response',
    example: 200,
    enum: HttpStatus,
    enumName: 'HttpStatus',
  })
  status: HttpStatus;

  @IsNotEmpty()
  message: string;

  @IsRFC3339()
  timestamp: number;
}
