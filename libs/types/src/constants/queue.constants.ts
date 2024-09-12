/**
 *  NOTE: Each service grouping (*-api, *-watcher) prefixes its BullMQ Redis connections with a service-specific
 *        prefix, so these queue names, while common, will be unique per-service. Thus a queue "myMessageQueue" in
 *        one service is distinct from a queue of the same name in another service.
 *
 *        Since the Gateway services are designed to be fully independent of one another, there should
 *        be no reason to construct shared queue names across services.
 */

import { AnnouncementTypeName } from '#types/enums/announcement-type.enum';

export namespace AccountQueues {
  /**
   * Name of the queue that publishes account transactions to Frequency blockchain
   */
  export const TRANSACTION_PUBLISH_QUEUE = 'transactionPublish';
}

export namespace ContentWatcherQueues {
  /**
   * Name of the queue that has all incoming requests
   */
  export const REQUEST_QUEUE_NAME = 'requestQueue';

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
   * Name of the queue that has all incoming IPFS messages from the blockchain
   */
  export const IPFS_QUEUE = 'contentIpfsQueue';
}

export namespace ContentPublishingQueues {
  /**
   * Name of the queue that has all incoming asset uploads
   */
  export const ASSET_QUEUE_NAME = 'assetQueue';
  /**
   * Name of the queue that has all incoming requests
   */
  // export const REQUEST_QUEUE_NAME = 'requestQueue';
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

  export const {
    REQUEST_QUEUE_NAME,
    BROADCAST_QUEUE_NAME,
    REPLY_QUEUE_NAME,
    REACTION_QUEUE_NAME,
    UPDATE_QUEUE_NAME,
    TOMBSTONE_QUEUE_NAME,
    PROFILE_QUEUE_NAME,
  } = ContentWatcherQueues;

  /**
   * Map between queue name and its announcement type
   */
  export const QUEUE_NAME_TO_ANNOUNCEMENT_MAP = new Map<string, AnnouncementTypeName>([
    [BROADCAST_QUEUE_NAME, AnnouncementTypeName.BROADCAST],
    [REPLY_QUEUE_NAME, AnnouncementTypeName.REPLY],
    [REACTION_QUEUE_NAME, AnnouncementTypeName.REACTION],
    [TOMBSTONE_QUEUE_NAME, AnnouncementTypeName.TOMBSTONE],
    [PROFILE_QUEUE_NAME, AnnouncementTypeName.PROFILE],
    [UPDATE_QUEUE_NAME, AnnouncementTypeName.UPDATE],
  ]);
}

export namespace GraphQueues {
  /**
   * Name of the queue that has all reconnecting requests
   */
  export const RECONNECT_REQUEST_QUEUE = 'reconnectRequest';

  /**
   * Name of the queue that has all incoming requests
   */
  export const GRAPH_CHANGE_REQUEST_QUEUE = 'graphChangeRequest';

  /**
   * Name of the queue that publishes graph changes to Frequency blockchain
   */
  export const GRAPH_CHANGE_PUBLISH_QUEUE = 'graphChangePublish';
}
