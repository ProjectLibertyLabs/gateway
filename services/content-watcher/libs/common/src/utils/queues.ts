import { createHash } from 'crypto';
import { AnnouncementTypeDto } from '../dtos/common.dto';

export namespace QueueConstants {
  /**
   * Name of the queue that has all incoming IPFS messages from the blockchain
   */
  export const IPFS_QUEUE = 'contentIpfsQueue';

  /**
   * Name of the queue that has all incoming requests for specific announcements
   * from the blockchain
   */
  export const REQUEST_QUEUE_NAME = 'contentRequestQueue';

  /**
   * Name of the queue that has all outgoing announcements from the blockchain
   */
  export const BROADCAST_QUEUE_NAME = 'watchBroadcastQueue';
  export const REPLY_QUEUE_NAME = 'watchReplyQueue';
  export const REACTION_QUEUE_NAME = 'watchReactionQueue';
  export const TOMBSTONE_QUEUE_NAME = 'watchTombstoneQueue';
  export const PROFILE_QUEUE_NAME = 'watchProfileQueue';
  /**
   * Map between announcement type and it's queueName
   */
  export const ANNOUNCEMENT_TO_QUEUE_NAME_MAP = new Map<AnnouncementTypeDto, string>([
    [AnnouncementTypeDto.BROADCAST, BROADCAST_QUEUE_NAME],
    [AnnouncementTypeDto.REPLY, REPLY_QUEUE_NAME],
    [AnnouncementTypeDto.REACTION, REACTION_QUEUE_NAME],
    [AnnouncementTypeDto.TOMBSTONE, TOMBSTONE_QUEUE_NAME],
    [AnnouncementTypeDto.PROFILE, PROFILE_QUEUE_NAME],
  ]);
  /**
   * Map between queue name and it's announcement type
   */
  export const QUEUE_NAME_TO_ANNOUNCEMENT_MAP = new Map<string, AnnouncementTypeDto>([
    [BROADCAST_QUEUE_NAME, AnnouncementTypeDto.BROADCAST],
    [REPLY_QUEUE_NAME, AnnouncementTypeDto.REPLY],
    [REACTION_QUEUE_NAME, AnnouncementTypeDto.REACTION],
    [TOMBSTONE_QUEUE_NAME, AnnouncementTypeDto.TOMBSTONE],
    [PROFILE_QUEUE_NAME, AnnouncementTypeDto.PROFILE],
  ]);
}

export const calculateJobId = (jobWithoutId: any): string => {
  const stringVal = JSON.stringify(jobWithoutId);
  return createHash('sha1').update(stringVal).digest('base64url');
};
