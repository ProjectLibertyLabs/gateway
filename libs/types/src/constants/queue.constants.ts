/**
 *  NOTE: Each service grouping (*-api, *-watcher) prefixes its BullMQ Redis connections with a service-specific
 *        prefix, so these queue names, while common, will be unique per-service. Thus a queue "myMessageQueue" in
 *        one service is distinct from a queue of the same name in another service.
 *
 *        Since the Gateway services are designed to be fully independent of one another, there should
 *        be no reason to construct shared queue names across services.
 */

import { IQueueModuleOptions } from '#queue/queue.interfaces';
import { AnnouncementTypeName } from '#types/enums/announcement-type.enum';

export namespace AccountQueues {
  /**
   * Name of the queue that publishes account transactions to Frequency blockchain
   */
  export const TRANSACTION_PUBLISH_QUEUE = 'transactionPublish';

  export const CONFIGURED_QUEUES: IQueueModuleOptions = {
    queues: [
      {
        name: TRANSACTION_PUBLISH_QUEUE,
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: false,
          attempts: 1,
        },
      },
    ],
  };
}

export namespace ContentWatcherQueues {
  /**
   * Name of the queue that has all incoming requests
   */
  export const WATCHER_REQUEST_QUEUE_NAME = 'watcherRequestQueue';

  /**
   * All of the announcement type queues
   */
  export const WATCHER_BROADCAST_QUEUE_NAME = 'watcherBroadcastQueue';
  export const WATCHER_REPLY_QUEUE_NAME = 'watcherReplyQueue';
  export const WATCHER_REACTION_QUEUE_NAME = 'watcherReactionQueue';
  export const WATCHER_UPDATE_QUEUE_NAME = 'watcherUpdateQueue';
  export const WATCHER_TOMBSTONE_QUEUE_NAME = 'watcherTombstoneQueue';
  export const WATCHER_PROFILE_QUEUE_NAME = 'watcherProfileQueue';

  /**
   * Name of the queue that has all incoming IPFS messages from the blockchain
   */
  export const WATCHER_IPFS_QUEUE = 'watcherContentIpfsQueue';

  export const CONFIGURED_QUEUES: IQueueModuleOptions = {
    config: {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    },
    queues: [
      {
        name: WATCHER_REQUEST_QUEUE_NAME,
      },
      {
        name: WATCHER_IPFS_QUEUE,
      },
      {
        name: WATCHER_BROADCAST_QUEUE_NAME,
      },
      {
        name: WATCHER_REPLY_QUEUE_NAME,
      },
      {
        name: WATCHER_REACTION_QUEUE_NAME,
      },
      {
        name: WATCHER_TOMBSTONE_QUEUE_NAME,
      },
      {
        name: WATCHER_PROFILE_QUEUE_NAME,
      },
      {
        name: WATCHER_UPDATE_QUEUE_NAME,
      },
    ],
  };
}

export namespace ContentPublishingQueues {
  /**
   * Name of the queue that has all incoming asset uploads
   */
  export const ASSET_QUEUE_NAME = 'assetQueue';
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
   * Name of the queue that has all incoming requests
   */
  export const REQUEST_QUEUE_NAME = 'requestQueue';

  /**
   * All the announcement type queues
   */
  export const BROADCAST_QUEUE_NAME = 'broadcastQueue';
  export const REPLY_QUEUE_NAME = 'replyQueue';
  export const REACTION_QUEUE_NAME = 'reactionQueue';
  export const UPDATE_QUEUE_NAME = 'updateQueue';
  export const TOMBSTONE_QUEUE_NAME = 'tombstoneQueue';
  export const PROFILE_QUEUE_NAME = 'profileQueue';

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

  export const CONFIGURED_QUEUES: IQueueModuleOptions = {
    queues: [
      {
        name: ASSET_QUEUE_NAME,
      },
      {
        name: REQUEST_QUEUE_NAME,
      },
      {
        name: BROADCAST_QUEUE_NAME,
      },
      {
        name: REPLY_QUEUE_NAME,
      },
      {
        name: REACTION_QUEUE_NAME,
      },
      {
        name: TOMBSTONE_QUEUE_NAME,
      },
      {
        name: UPDATE_QUEUE_NAME,
      },
      {
        name: PROFILE_QUEUE_NAME,
      },
      {
        name: BATCH_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: PUBLISH_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 1,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: STATUS_QUEUE_NAME,
      },
    ],
  };
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

  export const CONFIGURED_QUEUES: IQueueModuleOptions = {
    queues: [
      {
        name: GRAPH_CHANGE_REQUEST_QUEUE,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
        },
      },
      {
        name: GRAPH_CHANGE_PUBLISH_QUEUE,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 1,
        },
      },
      {
        name: RECONNECT_REQUEST_QUEUE,
        defaultJobOptions: {
          removeOnComplete: false,
          removeOnFail: false,
          attempts: 3,
        },
      },
    ],
  };
}

export namespace CommonConsumer {
  /**
   * Maximum waiting time in MS for graceful shutdown
   */
  export const MAX_WAIT_FOR_GRACE_FULL_SHUTDOWN_MS = 6 * 1000;

  /**
   * Time period between checks for graceful shutdown
   */
  export const DELAY_TO_CHECK_FOR_SHUTDOWN_MS = 300;
}
