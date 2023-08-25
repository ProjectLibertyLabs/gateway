/**
 * File name should always end with `.dto.ts` for swagger metadata generator to get picked up
 */
// eslint-disable-next-line no-shadow,max-classes-per-file
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

export class LinkDto {
  href: string;

  name?: string;
}

export class LocationDto {
  name: string;

  accuracy?: number;

  altitude?: number;

  longitude?: number;

  radius?: number;

  units?: UnitTypeDto;
}

export class AssetReferenceDto {
  referenceId: string;

  height?: number;

  width?: number;

  duration?: string;
}

export class TagDto {
  type: TagTypeDto;

  name?: string;

  mentionedId?: string;
}

export class AssetDto {
  type: AttachmentTypeDto;

  references: Array<AssetReferenceDto>;

  name?: string;

  href?: string;
}

export class BaseActivityDto {
  name?: string;

  tag?: Array<TagDto>;

  location?: LocationDto;
}

export class NoteActivityDto extends BaseActivityDto {
  content: string;

  published: string;

  assets?: Array<AssetDto>;
}

export class ProfileActivityDto extends BaseActivityDto {
  icon?: Array<AssetReferenceDto>;

  summary?: string;

  published?: string;
}
