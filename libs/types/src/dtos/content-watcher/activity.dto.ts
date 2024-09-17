/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DSNP_USER_URI_REGEX, DURATION_REGEX, ISO8601_REGEX } from './validation.dto';

// eslint-disable-next-line no-shadow
export enum UnitTypeDto {
  CM = 'cm',
  M = 'm',
  KM = 'km',
  INCHES = 'inches',
  FEET = 'feet',
  MILES = 'miles',
}

// eslint-disable-next-line no-shadow
export enum TagTypeDto {
  Mention = 'mention',
  Hashtag = 'hashtag',
}

// eslint-disable-next-line no-shadow
export enum AttachmentTypeDto {
  LINK = 'link',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export class LocationDto {
  @MinLength(1)
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  radius?: number;

  @IsOptional()
  @IsEnum(UnitTypeDto)
  units?: UnitTypeDto;
}

export class AssetReferenceDto {
  @MinLength(1)
  @IsString()
  referenceId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsString()
  @Matches(DURATION_REGEX)
  duration?: string;
}

export class TagDto {
  @IsEnum(TagTypeDto)
  type: TagTypeDto;

  @ValidateIf((o) => o.type === TagTypeDto.Hashtag)
  @MinLength(1)
  @IsString()
  name?: string;

  @ValidateIf((o) => o.type === TagTypeDto.Mention)
  @MinLength(1)
  @IsString()
  @Matches(DSNP_USER_URI_REGEX)
  mentionedId?: string;
}

export class AssetDto {
  @IsEnum(AttachmentTypeDto)
  type: AttachmentTypeDto;

  @ValidateIf((o) => o.type !== AttachmentTypeDto.LINK)
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((o) => o.referenceId)
  @Type(() => AssetReferenceDto)
  references?: AssetReferenceDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ValidateIf((o) => o.type === AttachmentTypeDto.LINK)
  @IsString()
  @MinLength(1)
  @IsUrl({ protocols: ['http', 'https'] })
  href?: string;
}

export class BaseActivityDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => TagDto)
  tag?: TagDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

export class NoteActivityDto extends BaseActivityDto {
  @MinLength(1)
  @IsString()
  content: string;

  @IsString()
  @Matches(ISO8601_REGEX)
  published: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => AssetDto)
  assets?: AssetDto[];
}

export class ProfileActivityDto extends BaseActivityDto {
  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayUnique((o) => o.referenceId)
  @Type(() => AssetReferenceDto)
  icon?: AssetReferenceDto[];

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  @Matches(ISO8601_REGEX)
  published?: string;
}
