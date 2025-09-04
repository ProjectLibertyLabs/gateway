/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */

import { IsEnum, IsInt, IsNotEmpty, IsString, Matches, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteActivityDto, ProfileActivityDto } from './activity.dto';
import { DSNP_CONTENT_HASH_REGEX, DSNP_CONTENT_URI_REGEX, DSNP_EMOJI_REGEX } from './validation.dto';
import { ApiProperty } from '@nestjs/swagger';

export enum ModifiableAnnouncementTypeDto {
  BROADCAST = 'broadcast',
  REPLY = 'reply',
}

export class BroadcastDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class ReplyDto {
  @IsString()
  @Matches(DSNP_CONTENT_URI_REGEX)
  inReplyTo: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class TombstoneDto {
  @IsString()
  @IsNotEmpty()
  @Matches(DSNP_CONTENT_HASH_REGEX, { message: 'targetContentHash must be in hexadecimal format!' })
  targetContentHash: string;

  @IsEnum(ModifiableAnnouncementTypeDto)
  @ApiProperty({
    enum: ModifiableAnnouncementTypeDto,
    enumName: 'ModifiableAnnouncementTypeDto',
  })
  targetAnnouncementType: ModifiableAnnouncementTypeDto;
}

export class UpdateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(DSNP_CONTENT_HASH_REGEX, { message: 'targetContentHash must be in hexadecimal format!' })
  targetContentHash: string;

  @IsEnum(ModifiableAnnouncementTypeDto)
  @ApiProperty({
    enum: ModifiableAnnouncementTypeDto,
    enumName: 'ModifiableAnnouncementTypeDto',
  })
  targetAnnouncementType: ModifiableAnnouncementTypeDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class ReactionDto {
  @MinLength(1)
  @IsString()
  @Matches(DSNP_EMOJI_REGEX)
  emoji: string;

  @IsInt()
  @Min(0)
  @Max(255)
  apply: number;

  @IsString()
  @Matches(DSNP_CONTENT_URI_REGEX)
  inReplyTo: string;
}

export class ProfileDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ProfileActivityDto)
  profile: ProfileActivityDto;
}

export type RequestTypeDto = BroadcastDto | ReplyDto | ReactionDto | UpdateDto | ProfileDto | TombstoneDto;
export type AssetIncludedRequestDto = BroadcastDto & ReplyDto & UpdateDto & ProfileDto;
