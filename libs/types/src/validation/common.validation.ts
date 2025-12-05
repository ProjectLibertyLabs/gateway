import { AnnouncementTypeName } from '#types/enums/announcement-type.enum';

/**
 * Common regex patterns and validation utilities shared across the gateway services
 */

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
 * DSNP content hash based on DSNP Spec
 * example: 0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef
 */
export const DSNP_CONTENT_HASH_REGEX = /^0x[0-9a-f]+$/i;

/**
 * DSNP user URI based on DSNP Spec
 * example: dsnp://78187493520
 */
export const DSNP_USER_URI_REGEX = /^dsnp:\/\/[1-9][0-9]{0,19}$/i;

/**
 * DSNP content URI based on DSNP Spec
 * example: dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef
 */
export const DSNP_CONTENT_URI_REGEX = /^dsnp:\/\/[1-9][0-9]{0,19}\/0x[0-9a-f]+$/i;

/**
 * DSNP character ranges for valid emojis
 */
export const DSNP_EMOJI_REGEX = /^[\u{2000}-\u{2BFF}\u{E000}-\u{FFFF}\u{1F000}-\u{FFFFF}]+$/u;

/**
 * Activity Stream Duration based on https://www.w3.org/TR/activitystreams-vocabulary/#dfn-duration
 * Enforce strict ISO 8601 duration format
 * Fixed for exponential backtracking vulnerability
 */
export const DURATION_REGEX =
  /^-?P(?:\d+Y(?:\d+M(?:\d+D)?)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|\d+M(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|\d+D(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?|T(?:\d+H(?:\d+M(?:\d+(?:\.\d+)?S)?)?|\d+M(?:\d+(?:\.\d+)?S)?|\d+(?:\.\d+)?S))$/;

/**
 * DSNP attachments mime types (basic set - MIME types allowed as resources/attachments by the DSNP spec)
 */
export const DSNP_VALID_MIME_TYPES_REGEX =
  /(image\/jpeg|image\/png|image\/svg\+xml|image\/webp|image\/gif|video\/mpeg|video\/ogg|video\/webm|video\/H256|video\/mp4|audio\/mpeg|audio\/ogg|audio\/webm)$/;

/**
 * Regex for valid DSNP image asset MIME types
 */
export const DSNP_VALID_IMAGE_MIME_TYPES_REGEX = /^image\/(jpeg|png|svg\+xml|webp|gif)$/;

/**
 * MIME types accepted for asset upload (extended set - includes DSNP asset types + parquet for batch files)
 */
export const VALID_UPLOAD_MIME_TYPES_REGEX =
  /(image\/jpeg|image\/png|image\/svg\+xml|image\/webp|image\/gif|video\/mpeg|video\/ogg|video\/webm|video\/H256|video\/mp4|audio\/mpeg|audio\/ogg|audio\/webm|application\/vnd.apache.parquet|application\/x-parquet)$/;

/**
 * MIME types accepted for batch files
 */
export const VALID_BATCH_MIME_TYPES_REGEX = /application\/vnd.apache.parquet|application\/x-parquet/;

/**
 * Validation utility functions
 */

/**
 * Checks to see if provided mime type is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType != null && mimeType.toLowerCase().startsWith('image');
}

/**
 * Checks to see if provided mime type is an Apache Parquet file
 */
export function isParquet(mimeType: string): boolean {
  return (
    mimeType != null &&
    (mimeType.toLowerCase() === 'application/vnd.apache.parquet' || mimeType.toLowerCase() === 'application/x-parquet')
  );
}

/**
 * Checks to see if the announcement type might have some assets
 */
export function isAssetIncludedType(announcementType: AnnouncementTypeName): boolean {
  return (
    announcementType === AnnouncementTypeName.PROFILE ||
    announcementType === AnnouncementTypeName.BROADCAST ||
    announcementType === AnnouncementTypeName.REPLY ||
    announcementType === AnnouncementTypeName.UPDATE
  );
}

/**
 * Validates ISO 8601 date string
 */
export function isValidISO8601(dateString: string): boolean {
  return ISO8601_REGEX.test(dateString);
}

/**
 * Validates DSNP content hash format
 */
export function isValidDsnpContentHash(hash: string): boolean {
  return DSNP_CONTENT_HASH_REGEX.test(hash);
}

/**
 * Validates DSNP user URI format
 */
export function isValidDsnpUserUri(uri: string): boolean {
  return DSNP_USER_URI_REGEX.test(uri);
}

/**
 * Validates DSNP content URI format
 */
export function isValidDsnpContentUri(uri: string): boolean {
  return DSNP_CONTENT_URI_REGEX.test(uri);
}

/**
 * Validates ISO 8601 duration format
 */
export function isValidDuration(duration: string): boolean {
  return DURATION_REGEX.test(duration);
}
