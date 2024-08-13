import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios';

declare namespace Components {
  namespace Schemas {
    export interface GraphChangeNotificationV1 {
      /**
       * MSA ID for which this notification is being sent
       * example:
       * 2
       */
      msaId: string;
      /**
       * Schema ID of graph that was updated
       * example:
       * 8
       */
      schemaId: number;
      /**
       * Page ID of graph page that was updated/deleted
       * example:
       * 15
       */
      pageId: number;
      /**
       * integer representation of the content hash of the updated page's previous state
       * example:
       * 123456
       */
      prevContentHash: number;
      /**
       * integer representation of the content hash of the updated pages new state
       */
      currContentHash?: number;
      /**
       * updateType
       */
      updateType: 'GraphPageUpdated' | 'GraphPageDeleted';
    }
    export interface GraphOperationStatusV1 {
      /**
       * Job reference ID of a previously submitted graph update request
       * example:
       * Lve95gjOVATpfV8EL5X4nxwjKHE
       */
      referenceId: string;
      /**
       * status
       */
      status: 'pending' | 'expired' | 'failed' | 'succeeded';
    }
  }
}

export interface OperationMethods {}

export interface PathsDictionary {}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>;
