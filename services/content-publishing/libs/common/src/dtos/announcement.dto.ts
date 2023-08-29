/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsEnum, IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteActivityDto, ProfileActivityDto } from './activity.dto';
import { DSNP_CONTENT_URI_REGEX, DSNP_EMOJI_REGEX } from '../constants';

// eslint-disable-next-line no-shadow
export enum AnnouncementTypeDto {
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

export class UpdateDto {
  @IsEnum(AnnouncementTypeDto)
  targetAnnouncementType: AnnouncementTypeDto;

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
