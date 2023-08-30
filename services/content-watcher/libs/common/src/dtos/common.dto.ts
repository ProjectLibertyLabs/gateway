/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsNotEmpty, IsNumberString } from 'class-validator';

export class DsnpUserIdParam {
  @IsNotEmpty()
  @IsNumberString({ no_symbols: true })
  userDsnpId: string;
}

export class DsnpContentHashParam {
  @IsNotEmpty()
  @IsHexadecimal({ message: 'targetContentHash must be in hexadecimal format!' })
  targetContentHash: string;
}

export class AnnouncementResponseDto {
  referenceId: string;
}

export class UploadResponseDto {
  assetIds: Array<string>;
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
