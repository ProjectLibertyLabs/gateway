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
import { DURATION_REGEX } from './validation.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIntValue } from '#utils/decorators/is-int-value.decorator';
import { IsDsnpUserURI } from '#utils/decorators/is-dsnp-user-uri.decorator';

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
  @ApiProperty({
    description: 'The display name for the location',
    type: String,
    example: 'New York City, NY',
  })
  @MinLength(1)
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The accuracy of the coordinates as a percentage.  (e.g. 94.0 means 94.0% accurate)',
    type: 'number',
    example: '94.0',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracy?: number;

  @ApiPropertyOptional({
    description: 'The altitude of the location',
    type: 'number',
    example: '10',
  })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional({
    description: 'The latitude of the location',
    type: 'number',
    example: '40.73',
  })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'The longitude of the location',
    type: 'number',
    example: '-73.93',
  })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'The area around the given point that comprises the location',
    type: 'number',
    example: '100',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  radius?: number;

  @ApiPropertyOptional({
    description: 'The units for radius and altitude (defaults to meters)',
    type: String,
    example: 'm',
  })
  @IsOptional()
  @IsEnum(UnitTypeDto)
  units?: UnitTypeDto;
}

export class AssetReferenceDto {
  @ApiProperty({
    description: 'The unique Id for the uploaded asset.',
    type: String,
    example: 'bafybeibzj4b4zt4h6n2f6i6lam3cidmywqj5rznb2ofr3gnahurorje2tu',
  })
  @MinLength(1)
  @IsString()
  referenceId: string;

  @ApiPropertyOptional({
    description: 'A hint as to the rendering height in device-independent pixels for image or video assets.',
    type: 'number',
    example: '228',
  })
  @IsOptional()
  @IsIntValue({ minValue: 0 })
  height?: number;

  @ApiPropertyOptional({
    description: 'A hint as to the rendering width in device-independent pixels for image or video asset',
    type: 'number',
    example: '350',
  })
  @IsOptional()
  @IsIntValue({ minValue: 0 })
  width?: number;

  @ApiPropertyOptional({
    description: 'Approximate duration of the video or audio asset',
    type: String,
    example: 'PT10M32S',
  })
  @IsOptional()
  @IsString()
  @Matches(DURATION_REGEX)
  duration?: string;
}

export class TagDto {
  @ApiProperty({
    description: 'Identifies the tag type',
    type: String,
    example: 'mention',
  })
  @IsEnum(TagTypeDto)
  type: TagTypeDto;

  @ApiPropertyOptional({
    description: 'The text of the tag',
    type: String,
    example: '@sally',
  })
  @ValidateIf((o) => o.type === TagTypeDto.Hashtag)
  @MinLength(1)
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Link to the user mentioned',
    type: String,
    example: 'dsnp://12345678',
  })
  @ValidateIf((o) => o.type === TagTypeDto.Mention)
  @IsDsnpUserURI({ message: 'Invalid DSNP User URI' })
  mentionedId?: string;
}

export class AssetDto {
  @ApiPropertyOptional({
    description: 'Determines that if this asset is a link',
    type: 'boolean',
    example: 'false',
  })
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

  @ApiPropertyOptional({
    description: 'The display name for the file',
    type: String,
    example: 'TheScream',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: 'The URL for the given content',
    type: String,
    example: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Wilhelm_Scream.ogg',
  })
  @ValidateIf((o) => o.isLink === true)
  @IsString()
  @MinLength(1)
  @IsUrl({ protocols: ['http', 'https'] })
  href?: string;
}

export class BaseActivityDto {
  @ApiPropertyOptional({
    description: 'The display name for the activity type',
    type: String,
    example: 'A simple activity',
  })
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
  @ApiProperty({
    description: 'Text content of the note',
    type: String,
    example: 'Hello world!',
  })
  @MinLength(1)
  @IsString()
  content: string;

  @ApiProperty({
    description: 'The time of publishing ISO8601',
    type: String,
    example: '1970-01-01T00:00:00+00:00',
  })
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

  @ApiPropertyOptional({
    description: 'Used as a plain text biography of the profile',
    type: String,
    example: 'John Doe is actually a small kitten.',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'The time of publishing ISO8601',
    type: String,
    example: '1970-01-01T00:00:00+00:00',
  })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  published?: string;
}
