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
import {
  IBatchFile,
  IBatchFiles,
  IBatchAnnouncement,
  IBatchAnnouncementResponse,
  IBroadcast,
  IProfile,
  IReaction,
  IReply,
  ITombstone,
  IUpdate,
} from '#types/interfaces';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { IsCidV1 } from '#utils/decorators/is-cidv1.decorator';

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
   * CIDv1 of off-chain batch file
   * @example "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
   */
  @IsCidV1()
  cid: string;
}

export class BatchFilesDto implements IBatchFiles {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchFileDto)
  batchFiles: BatchFileDto[];
}

export class BatchAnnouncementDto implements IBatchAnnouncement {
  @ApiProperty({
    description: 'Unique identifier for tracking the batch announcement',
    example: 'batch_12345',
  })
  referenceId: string;

  @ApiProperty({
    description: 'IPFS CID of the uploaded file',
    example: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  })
  cid: string;

  @ApiProperty({
    description:
      'Error message if the file upload or batch creation failed. Will be undefined in successful responses since this endpoint uses all-or-nothing error handling.',
    required: false,
    example: undefined,
  })
  error?: string;
}

export class BatchAnnouncementResponseDto implements IBatchAnnouncementResponse {
  @ApiProperty({
    description: 'Array of batch announcement results for each uploaded file',
    type: [BatchAnnouncementDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchAnnouncementDto)
  files: BatchAnnouncementDto[];
}

export type RequestTypeDto = BroadcastDto | ReplyDto | ReactionDto | UpdateDto | ProfileDto | TombstoneDto;
export type AssetIncludedRequestDto = BroadcastDto & ReplyDto & UpdateDto & ProfileDto & BatchFilesDto;
