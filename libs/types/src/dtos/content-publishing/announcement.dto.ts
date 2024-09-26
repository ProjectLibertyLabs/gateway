/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsEnum, IsNotEmpty, IsString, Matches, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteActivityDto, ProfileActivityDto } from './activity.dto';
import { DSNP_EMOJI_REGEX } from './validation.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDsnpContentURI } from '#utils/decorators/is-dsnp-content-uri.decorator';
import { IsDsnpContentHash } from '#utils/decorators/is-dsnp-content-hash.decorator';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';

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
  @ApiProperty({
    description: 'Target DSNP Content URI',
    type: String,
    example: 'dsnp://78187493520/bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
  })
  @IsDsnpContentURI()
  inReplyTo: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class TombstoneDto {
  @ApiProperty({
    description: 'Target DSNP Content Hash',
    type: String,
    example: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
  })
  @IsDsnpContentHash()
  @IsNotEmpty()
  targetContentHash: string;

  @ApiProperty({
    description: 'Target announcement type',
    type: String,
    example: 'broadcast',
  })
  @IsEnum(ModifiableAnnouncementTypeDto)
  targetAnnouncementType: ModifiableAnnouncementTypeDto;
}

export class UpdateDto {
  @ApiProperty({
    description: 'Target DSNP Content Hash',
    type: String,
    example: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
  })
  @IsDsnpContentHash()
  @IsNotEmpty()
  targetContentHash: string;

  @ApiProperty({
    description: 'Target announcement type',
    type: String,
    example: 'broadcast',
  })
  @IsEnum(ModifiableAnnouncementTypeDto)
  targetAnnouncementType: ModifiableAnnouncementTypeDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class ReactionDto {
  @ApiProperty({
    description: 'the encoded reaction emoji',
    type: String,
    example: '😀',
  })
  @MinLength(1)
  @IsString()
  @Matches(DSNP_EMOJI_REGEX)
  emoji: string;

  @ApiProperty({
    description: 'Indicates whether the emoji should be applied and if so, at what strength',
    type: 'number',
    example: '1',
  })
  @IsIntValue({ minValue: 0, maxValue: 255 })
  apply: number;

  @ApiProperty({
    description: 'Target DSNP Content URI',
    type: String,
    example: 'dsnp://78187493520/bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
  })
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
