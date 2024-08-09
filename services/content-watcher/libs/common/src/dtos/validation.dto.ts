import { AnnouncementTypeDto } from './common.dto';

/**
 * Regex for ISO 8601
 * - T separation
 * - Required Time
 * - Supports fractional seconds
 * - Z or hour minute offset
 * - example: 1970-01-01T00:00:00+00:00
 */
export const ISO8601_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,})?(Z|[+-][01][0-9]:[0-5][0-9])?$/;
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
 */
export const DURATION_REGEX = /^-?P(([0-9]+Y)?([0-9]+M)?([0-9]+D)?(T([0-9]+H)?([0-9]+M)?([0-9]+(\.[0-9]+)?S)?)?)+$/;
/**
 * Dsnp attachments mime types
 */
export const DSNP_VALID_MIME_TYPES =
  /(image\/jpeg|image\/png|image\/svg\+xml|image\/webp|image\/gif|video\/mpeg|video\/ogg|video\/webm|video\/H256|video\/mp4|audio\/mpeg|audio\/ogg|audio\/webm)$/;
/**
 * checks to see if provided mime type is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType != null && mimeType.toLowerCase().startsWith('image');
}
/**
 * checks to see if the type might have some assets
 */
export function isAssetIncludedType(announcementType: AnnouncementTypeDto): boolean {
  return (
    announcementType === AnnouncementTypeDto.PROFILE ||
    announcementType === AnnouncementTypeDto.BROADCAST ||
    announcementType === AnnouncementTypeDto.REPLY ||
    announcementType === AnnouncementTypeDto.UPDATE
  );
}
