export namespace QueueConstants {
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

  /**
   * Name of the queue that processes graph change notifications
   */
  export const GRAPH_CHANGE_NOTIFY_QUEUE = 'graphChangeNotify';
}
