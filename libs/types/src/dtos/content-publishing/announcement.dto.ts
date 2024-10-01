/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsEnum, IsNotEmpty, IsString, Matches, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteActivityDto, ProfileActivityDto } from './activity.dto';
import { DSNP_EMOJI_REGEX } from './validation';
import { IsDsnpContentURI } from '#utils/decorators/is-dsnp-content-uri.decorator';
import { IsDsnpContentHash } from '#utils/decorators/is-dsnp-content-hash.decorator';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';

// eslint-disable-next-line no-shadow
export enum ModifiableAnnouncementType {
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
  /**
   * Target DSNP Content URI
   * @example 'dsnp://78187493520/bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna'
   */
  @IsDsnpContentURI()
  inReplyTo: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class TombstoneDto {
  /**
   * Target DSNP Content Hash
   * @example 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna'
   */
  @IsDsnpContentHash()
  @IsNotEmpty()
  targetContentHash: string;

  /**
   * Target announcement type
   * @example 'broadcast'
   */
  @IsEnum(ModifiableAnnouncementType)
  targetAnnouncementType: ModifiableAnnouncementType;
}

export class UpdateDto {
  /**
   * Target DSNP Content Hash
   * @example 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna'
   */
  @IsDsnpContentHash()
  @IsNotEmpty()
  targetContentHash: string;

  /**
   * Target announcement type
   * @example 'broadcast'
   */
  @IsEnum(ModifiableAnnouncementType)
  targetAnnouncementType: ModifiableAnnouncementType;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class ReactionDto {
  /**
   * the encoded reaction emoji
   * @example '😀'
   */
  @MinLength(1)
  @IsString()
  @Matches(DSNP_EMOJI_REGEX)
  emoji: string;

  /**
   * Indicates whether the emoji should be applied and if so, at what strength
   * @example 1
   */
  @IsIntValue({ minValue: 0, maxValue: 255 })
  apply: number;

  /**
   * Target DSNP Content URI
   * @example 'dsnp://78187493520/bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna'
   */
  @IsDsnpContentURI()
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
