import { AnnouncementTypeDto } from '#libs/dtos';

/**
 * Name of the queue that has all incoming asset uploads
 */
export const ASSET_QUEUE_NAME = 'assetQueue';
/**
 * Name of the queue that has all incoming requests
 */
export const REQUEST_QUEUE_NAME = 'requestQueue';
/**
 * Name of the queue that has all individual announcements batched together
 */
export const BATCH_QUEUE_NAME = 'batchQueue';
/**
 * Name of the queue that has all items that needs to be published to Frequency chain
 */
export const PUBLISH_QUEUE_NAME = 'publishQueue';
/**
 * Name of the queue that has all the jobs and items that needs to run periodically or check their status
 */
export const STATUS_QUEUE_NAME = 'statusQueue';

/**
 * All of the announcement type queues
 */
export const BROADCAST_QUEUE_NAME = 'broadcastQueue';
export const REPLY_QUEUE_NAME = 'replyQueue';
export const REACTION_QUEUE_NAME = 'reactionQueue';
export const UPDATE_QUEUE_NAME = 'updateQueue';
export const TOMBSTONE_QUEUE_NAME = 'tombstoneQueue';
export const PROFILE_QUEUE_NAME = 'profileQueue';
/**
 * Map between queue name and it's announcement type
 */
export const QUEUE_NAME_TO_ANNOUNCEMENT_MAP = new Map<string, AnnouncementTypeDto>([
  [BROADCAST_QUEUE_NAME, AnnouncementTypeDto.BROADCAST],
  [REPLY_QUEUE_NAME, AnnouncementTypeDto.REPLY],
  [REACTION_QUEUE_NAME, AnnouncementTypeDto.REACTION],
  [UPDATE_QUEUE_NAME, AnnouncementTypeDto.UPDATE],
  [TOMBSTONE_QUEUE_NAME, AnnouncementTypeDto.TOMBSTONE],
  [PROFILE_QUEUE_NAME, AnnouncementTypeDto.PROFILE],
]);
