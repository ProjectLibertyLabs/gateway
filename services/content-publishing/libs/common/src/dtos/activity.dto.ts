/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
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
import { DURATION_REGEX } from './validation.dto';
import { IsDsnpUserURI } from '#libs/utils/dsnp-validation.decorator';

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
export enum AttachmentType {
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
  @IsDsnpUserURI({ message: 'Invalid DSNP User URI' })
  mentionedId?: string;
}

export class AssetDto {
  @ValidateIf((o) => o.type !== AttachmentType.LINK)
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

  @ValidateIf((o) => o.type === AttachmentType.LINK)
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

  @IsISO8601({ strict: true, strictSeparator: true })
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
  @IsISO8601({ strict: true, strictSeparator: true })
  published?: string;
}
