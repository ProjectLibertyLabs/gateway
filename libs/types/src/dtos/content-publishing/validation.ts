import { AnnouncementTypeName } from '#types/enums';

/**
 * Regex for ISO 8601
 * - T separation
 * - Required Time
 * - Supports fractional seconds
 * - Z or hour minute offset
 * - example: 1970-01-01T00:00:00+00:00
 */
export const ISO8601_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-][01][0-9]:[0-5][0-9])?$/;
/**
 * DSNP character ranges for valid emojis
 */
export const DSNP_EMOJI_REGEX = /^[\u{2000}-\u{2BFF}\u{E000}-\u{FFFF}\u{1F000}-\u{FFFFF}]+$/u;
/**
 * Activity Stream Duration based on https://www.w3.org/TR/activitystreams-vocabulary/#dfn-duration
 */
export const DURATION_REGEX = /^-?P(([0-9]+Y)?([0-9]+M)?([0-9]+D)?(T([0-9]+H)?([0-9]+M)?([0-9]+(\.[0-9]+)?S)?)?)+$/;
/**
 * Dsnp attachments mime types
 */
export const DSNP_VALID_MIME_TYPES =
  /(image\/jpeg|image\/png|image\/svg\+xml|image\/webp|image\/gif|video\/mpeg|video\/ogg|video\/webm|video\/H256|video\/mp4|audio\/mpeg|audio\/ogg|audio\/webm|application\/vnd.apache.parquet|application\/x-parquet)$/;
/**
 * checks to see if provided mime type is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType != null && mimeType.toLowerCase().startsWith('image');
}
/**
 * checks to see if provided mime type is an Apache Parquet file
 */
export function isParquet(mimeType: string): boolean {
  return (
    mimeType != null &&
    (mimeType.toLowerCase() === 'application/vnd.apache.parquet' || mimeType.toLowerCase() === 'application/x-parquet')
  );
}
/**
 * checks to see if the type might have some assets
 */
export function isAssetIncludedType(announcementType: AnnouncementTypeName): boolean {
  return (
    announcementType === AnnouncementTypeName.PROFILE ||
    announcementType === AnnouncementTypeName.BROADCAST ||
    announcementType === AnnouncementTypeName.REPLY ||
    announcementType === AnnouncementTypeName.UPDATE
  );
}
