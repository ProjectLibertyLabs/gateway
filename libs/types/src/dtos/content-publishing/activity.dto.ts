/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line max-classes-per-file
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
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
import { DURATION_REGEX } from './validation';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { IsDsnpUserURI } from '#utils/decorators/is-dsnp-user-uri.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// eslint-disable-next-line no-shadow
export enum UnitTypeEnum {
  CM = 'cm',
  M = 'm',
  KM = 'km',
  INCHES = 'inches',
  FEET = 'feet',
  MILES = 'miles',
}

// eslint-disable-next-line no-shadow
export enum TagTypeEnum {
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
  /**
   * The display name for the location
   * @example 'New York, NY'
   */
  @MinLength(1)
  @IsString()
  name: string;

  /**
   * The accuracy of the coordinates as a percentage.  (e.g. 94.0 means 94.0% accurate)
   * @example 94.0
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracy?: number;

  /**
   * The altitude of the location
   * @example 10
   */
  @IsOptional()
  @IsNumber()
  altitude?: number;

  /**
   * The latitude of the location
   * @example 40.73
   */
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  /**
   * The longitude of the location
   * @example -73.93
   */
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  /**
   * The area around the given point that comprises the location
   * @example 100
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  radius?: number;

  @IsOptional()
  @IsEnum(UnitTypeEnum)
  @ApiPropertyOptional({
    description: 'The units for radius and altitude (defaults to meters)',
    example: 'm',
    enum: UnitTypeEnum,
    enumName: 'UnitTypeEnum',
  })
  units?: UnitTypeEnum;
}

export class AssetReferenceDto {
  /**
   * The unique Id for the uploaded asset
   * @example 'bafybeibzj4b4zt4h6n2f6i6lam3cidmywqj5rznb2ofr3gnahurorje2tu'
   */
  @MinLength(1)
  @IsString()
  referenceId: string;

  /**
   * A hint as to the rendering height in device-independent pixels for image or video assets
   * @example 228
   */
  @IsOptional()
  @IsIntValue({ minValue: 0 })
  height?: number;

  /**
   * A hint as to the rendering width in device-independent pixels for image or video asset
   * @example 350
   */
  @IsOptional()
  @IsIntValue({ minValue: 0 })
  width?: number;

  /**
   * Approximate duration of the video or audio asset
   * @example 'PT10M32S'
   */
  @IsOptional()
  @IsString()
  @Matches(DURATION_REGEX)
  duration?: string;
}

export class TagDto {
  @IsEnum(TagTypeEnum)
  @ApiProperty({
    description: 'Identifies the tag type',
    example: 'mention',
    enum: TagTypeEnum,
    enumName: 'TagTypeEnum',
  })
  type: TagTypeEnum;

  /**
   * The text of the tag
   * @example '@sally'
   */
  @ValidateIf((o) => o.type === TagTypeEnum.Hashtag)
  @MinLength(1)
  @IsString()
  name?: string;

  /**
   * Link to the user mentioned
   * @example 'dsnp://12345678'
   */
  @ValidateIf((o) => o.type === TagTypeEnum.Mention)
  @IsDsnpUserURI({ message: 'Invalid DSNP User URI' })
  mentionedId?: string;
}

export class AssetDto {
  /**
   * Determines if this asset is a link
   * @example false
   */
  @IsOptional()
  @IsBoolean()
  isLink?: boolean;

  @ValidateIf((o) => o.isLink !== true)
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((o) => o.referenceId)
  @Type(() => AssetReferenceDto)
  references?: AssetReferenceDto[];

  /**
   * The display name for the file
   * @example 'TheScream'
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  /**
   * The URL for the given content
   * @example 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Wilhelm_Scream.ogg'
   */
  @ValidateIf((o) => o.isLink === true)
  @IsString()
  @MinLength(1)
  @IsUrl({ protocols: ['http', 'https'] })
  href?: string;
}

export class BaseActivityDto {
  /**
   * The display name for the activity type
   * @example 'A simple activity'
   */
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
  /**
   * Text content of the note
   * @example 'Hello world!'
   */
  @MinLength(1)
  @IsString()
  content: string;

  /**
   * The time of publishing ISO8601
   * @example '1970-01-01T00:00:00+00:00'
   */
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

  /**
   * Used as a plain text biography of the profile
   * @example 'John Doe is actually a small kitten.'
   */
  @IsOptional()
  @IsString()
  summary?: string;

  /**
   * The time of publishing ISO8601
   * @example '1970-01-01T00:00:00+00:00'
   */
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  published?: string;
}
