/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */

import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexadecimal,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
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
import { OnChainJobData } from '#types/interfaces';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';
import { HexString } from '@polkadot/util/types';
import { UnitTypeEnum } from '../../enums/unit-type.enum';
import { TagTypeEnum } from '../../enums/tag-type.enum';
import {
  IAsset,
  IAssetReference,
  IBaseActivity,
  ILocation,
  INoteActivity,
  IProfileActivity,
  ITag,
} from '#types/interfaces/content-publishing/activity.interface';

export class LocationDto implements ILocation {
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

export class AssetReferenceDto implements IAssetReference {
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

export class TagDto implements ITag {
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

export class AssetDto implements IAsset {
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

export class BaseActivityDto implements IBaseActivity {
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

export class NoteActivityDto extends BaseActivityDto implements INoteActivity {
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

export class ProfileActivityDto extends BaseActivityDto implements IProfileActivity {
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

export class OnChainContentDto implements OnChainJobData {
  /**
   * Schema ID of the OnChain schema this message is being posted to.
   * @example: 16
   */
  @IsSchemaId()
  schemaId: number;

  /**
   *  Payload bytes encoded as a hex string using the schema defined by `schemaId`
   */
  @IsNotEmpty()
  @IsHexadecimal()
  @Matches(/^0x/, { message: "payload bytes must include '0x' prefix" })
  payload: HexString;

  /**
   * The time of publishing ISO8601
   * @example '1970-01-01T00:00:00+00:00'
   */
  @IsISO8601({ strict: true, strictSeparator: true })
  published: string;
}
