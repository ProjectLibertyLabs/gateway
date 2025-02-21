/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import { IsArray, IsEnum, IsNotEmpty, IsString, Matches, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteActivityDto, ProfileActivityDto } from './activity.dto';
import { DSNP_EMOJI_REGEX } from './validation';
import { IsDsnpContentURI } from '#utils/decorators/is-dsnp-content-uri.decorator';
import { IsDsnpContentHash } from '#utils/decorators/is-dsnp-content-hash.decorator';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IBatchFile, IBroadcast, IProfile, IReaction, IReply, ITombstone, IUpdate } from '#types/interfaces';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';

// eslint-disable-next-line no-shadow
export enum ModifiableAnnouncementType {
  BROADCAST = 'broadcast',
  REPLY = 'reply',
}

export class BroadcastDto implements IBroadcast {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class ReplyDto implements IReply {
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

export class TombstoneDto implements ITombstone {
  /**
   * Target DSNP Content Hash
   * @example 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna'
   */
  @IsDsnpContentHash()
  @IsNotEmpty()
  targetContentHash: string;

  @IsEnum(ModifiableAnnouncementType)
  @ApiProperty({
    description: 'Target announcement type',
    example: 'broadcast',
    enum: ModifiableAnnouncementType,
    enumName: 'ModifiableAnnouncementType',
  })
  targetAnnouncementType: ModifiableAnnouncementType;
}

export class UpdateDto implements IUpdate {
  /**
   * Target DSNP Content Hash
   * @example 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna'
   */
  @IsDsnpContentHash()
  @IsNotEmpty()
  targetContentHash: string;

  @IsEnum(ModifiableAnnouncementType)
  @ApiProperty({
    description: 'Target announcement type',
    example: 'broadcast',
    enum: ModifiableAnnouncementType,
    enumName: 'ModifiableAnnouncementType',
  })
  targetAnnouncementType: ModifiableAnnouncementType;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NoteActivityDto)
  content: NoteActivityDto;
}

export class ReactionDto implements IReaction {
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

export class ProfileDto implements IProfile {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ProfileActivityDto)
  profile: ProfileActivityDto;
}

export class BatchFileDto implements IBatchFile {
  /**
   * Schema ID of batched off-chain content
   * @example 123
   */
  @IsSchemaId()
  schemaId: number;

  /**
   * Reference ID of off-chain batch file
   * @example "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
   */
  @IsString()
  @MinLength(1)
  referenceId: string;
}

export class BatchFilesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchFileDto)
  batchFiles: BatchFileDto[];
}

export type RequestTypeDto = BroadcastDto | ReplyDto | ReactionDto | UpdateDto | ProfileDto | TombstoneDto;
export type AssetIncludedRequestDto = BroadcastDto & ReplyDto & UpdateDto & ProfileDto & BatchFilesDto;
