/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IFileResponse, IUploadResponse } from '#types/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class AnnouncementResponseDto {
  referenceId: string;
}

export class UploadResponseDto {
  assetIds: string[];
}

export class FilesUploadDto {
  @IsArray()
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  files: any[];
}

export class FileResponseDto implements IFileResponse {
  cid?: string;

  error?: string;
}

export class UploadResponseDtoV2 implements IUploadResponse {
  files: FileResponseDto[];
}
