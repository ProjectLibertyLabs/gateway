/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { IScanReset } from '#types/interfaces/content-watcher';

export class ResetScannerDto implements IScanReset {
  @ApiPropertyOptional({
    required: false,
    type: 'number',
    description: 'The block number to reset the scanner to',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  blockNumber?: number;

  @ApiPropertyOptional({
    required: false,
    type: 'number',
    description: 'Number of blocks to rewind the scanner to (from `blockNumber` if supplied; else from latest block)',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  rewindOffset?: number;

  @ApiPropertyOptional({
    required: false,
    type: 'boolean',
    description: 'Whether to schedule the new scan immediately or wait for the next scheduled interval',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}
