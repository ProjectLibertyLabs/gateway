/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsEnum, IsInt, IsNotEmpty, IsString, Matches, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteActivityDto, ProfileActivityDto } from './activity.dto';
import { DSNP_EMOJI_REGEX } from './validation.dto';
import { IsDsnpContentURI, IsDsnpContentHash } from '#libs/utils/dsnp-validation.decorator';

// eslint-disable-next-line no-shadow
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
  @IsDsnpContentURI({ message: 'Invalid DSNP Content URI' })
  inReplyTo: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class TombstoneDto {
  @IsDsnpContentHash({ message: 'Invalid DSNP content hash' })
  @IsNotEmpty()
  targetContentHash: string;

  @IsEnum(ModifiableAnnouncementTypeDto)
  targetAnnouncementType: ModifiableAnnouncementTypeDto;
}

export class UpdateDto {
  @IsDsnpContentHash({ message: 'Invalid DSNP content hash' })
  @IsNotEmpty()
  targetContentHash: string;

  @IsEnum(ModifiableAnnouncementTypeDto)
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

  @IsDsnpContentURI({ message: 'Invalid DSNP Content URI' })
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
