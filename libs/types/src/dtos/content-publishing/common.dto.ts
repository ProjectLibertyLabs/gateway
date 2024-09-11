/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString } from 'class-validator';

export class DsnpUserIdParam {
  @IsNotEmpty()
  @IsNumberString({ no_symbols: true })
  userDsnpId: string;
}

export class AnnouncementResponseDto {
  referenceId: string;
}

export class UploadResponseDto {
  @ApiProperty()
  assetIds: string[];
}

export class FilesUploadDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  files: any[];
}

// eslint-disable-next-line no-shadow
export enum AnnouncementTypeDto {
  BROADCAST = 'broadcast',
  REPLY = 'reply',
  REACTION = 'reaction',
  UPDATE = 'update',
  TOMBSTONE = 'tombstone',
  PROFILE = 'profile',
}
