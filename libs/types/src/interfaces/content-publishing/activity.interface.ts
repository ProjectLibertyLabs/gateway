import { UnitTypeEnum } from '#types/enums/unit-type.enum';
import { TagTypeEnum } from '#types/enums/tag-type.enum';

export interface ILocation {
  /**
   * The display name for the location
   */
  name: string;

  /**
   * The accuracy of the coordinates as a percentage.  (e.g. 94.0 means 94.0% accurate)
   */
  accuracy?: number;

  /**
   * The altitude of the location
   */
  altitude?: number;

  /**
   * The latitude of the location
   */
  latitude?: number;

  /**
   * The longitude of the location
   */
  longitude?: number;

  /**
   * The area around the given point that comprises the location
   */
  radius?: number;

  units?: UnitTypeEnum;
}

export interface IAssetReference {
  /**
   * The unique Id for the uploaded asset
   */
  referenceId: string;

  /**
   * A hint as to the rendering height in device-independent pixels for image or video assets
   */
  height?: number;

  /**
   * A hint as to the rendering width in device-independent pixels for image or video asset
   */
  width?: number;

  /**
   * Approximate duration of the video or audio asset
   */
  duration?: string;
}

export interface ITag {
  type: TagTypeEnum;

  /**
   * The text of the tag
   */
  name?: string;

  /**
   * Link to the user mentioned
   */
  mentionedId?: string;
}

export interface IAsset {
  /**
   * Determines if this asset is a link
   */
  isLink?: boolean;

  references?: IAssetReference[];

  /**
   * The display name for the file
   */
  name?: string;

  /**
   * The URL for the given content
   */
  href?: string;
}

export interface IBaseActivity {
  /**
   * The display name for the activity type
   */
  name?: string;

  tag?: ITag[];

  location?: ILocation;
}

export interface INoteActivity extends IBaseActivity {
  /**
   * Text content of the note
   */
  content: string;

  /**
   * The time of publishing ISO8601
   */
  published: string;

  assets?: IAsset[];
}

export interface IProfileActivity extends IBaseActivity {
  icon?: IAssetReference[];

  /**
   * Used as a plain text biography of the profile
   */
  summary?: string;

  /**
   * The time of publishing ISO8601
   */
  published?: string;
}
