/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumberString, IsOptional, Max, Min } from 'class-validator';
import { IScanReset } from '#types/interfaces/content-watcher';

export class DsnpUserIdParam {
  @IsNotEmpty()
  @IsNumberString({ no_symbols: true })
  userDsnpId: string;
}

export class AnnouncementResponseDto {
  referenceId: string;
}

export class UploadResponseDto {
  assetIds: string[];
}

export class FilesUploadDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  files: any[];
}

export class ResetScannerDto implements IScanReset {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  @ApiProperty({ required: false, type: 'number', description: 'The block number to reset the scanner to', example: 0 })
  blockNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4_294_967_296)
  @ApiProperty({
    required: false,
    type: 'number',
    description: 'Number of blocks to rewind the scanner to (from `blockNumber` if supplied; else from latest block)',
    example: 100,
  })
  rewindOffset?: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    required: false,
    type: 'boolean',
    description: 'Whether to schedule the new scan immediately or wait for the next scheduled interval',
    example: true,
  })
  immediate?: boolean;
}
