import {
  AccountQueues,
  ContentPublishingQueues,
  ContentWatcherQueues,
  GraphQueues,
} from '#types/constants/queue.constants';

export const QUEUE_NAME_TO_REDIS_KEY_MAP = {
  [AccountQueues.TRANSACTION_PUBLISH_QUEUE]: 'bull:accountTransactionPublishQueue',
  [ContentPublishingQueues.ASSET_QUEUE_NAME]: 'bull:assetQueue',
  [ContentPublishingQueues.REQUEST_QUEUE_NAME]: 'bull:requestQueue',
  [ContentPublishingQueues.PUBLISH_QUEUE_NAME]: 'bull:publishQueue',
  [ContentPublishingQueues.BATCH_QUEUE_NAME]: 'bull:batchQueue',
  [ContentWatcherQueues.WATCHER_REQUEST_QUEUE_NAME]: 'bull:watcherRequestQueue',
  [ContentWatcherQueues.WATCHER_BROADCAST_QUEUE_NAME]: 'bull:watcherBroadcastQueue',
  [ContentWatcherQueues.WATCHER_REPLY_QUEUE_NAME]: 'bull:watcherReplyQueue',
  [ContentWatcherQueues.WATCHER_REACTION_QUEUE_NAME]: 'bull:watcherReactionQueue',
  [ContentWatcherQueues.WATCHER_UPDATE_QUEUE_NAME]: 'bull:watcherUpdateQueue',
  [ContentWatcherQueues.WATCHER_TOMBSTONE_QUEUE_NAME]: 'bull:watcherTombstoneQueue',
  [ContentWatcherQueues.WATCHER_PROFILE_QUEUE_NAME]: 'bull:watcherProfileQueue',
  [ContentWatcherQueues.WATCHER_IPFS_QUEUE]: 'bull:watcherIpfsQueue',
  [GraphQueues.RECONNECT_REQUEST_QUEUE]: 'bull:reconnectRequestQueue',
  [GraphQueues.GRAPH_CHANGE_REQUEST_QUEUE]: 'bull:graphChangeRequestQueue',
  [GraphQueues.GRAPH_CHANGE_PUBLISH_QUEUE]: 'bull:graphChangePublishQueue',
} as const;
