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
       * MSA Id for which this notification is being sent
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
declare namespace Paths {
  namespace AnnounceGraphUpdateV1 {
    export type RequestBody = Components.Schemas.GraphChangeNotificationV1;
    namespace Responses {
      export interface $200 {}
      export interface $400 {}
    }
  }
  namespace UpdateOperationStatusV1 {
    export type RequestBody = Components.Schemas.GraphOperationStatusV1;
    namespace Responses {
      export interface $200 {}
      export interface $400 {}
    }
  }
}

export interface OperationMethods {
  /**
   * announceGraphUpdateV1 - Announce a graph update
   */
  'announceGraphUpdateV1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AnnounceGraphUpdateV1.RequestBody,
    config?: AxiosRequestConfig,
  ): OperationResponse<Paths.AnnounceGraphUpdateV1.Responses.$200>;
  /**
   * updateOperationStatusV1 - Send the status of a requested graph update
   */
  'updateOperationStatusV1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.UpdateOperationStatusV1.RequestBody,
    config?: AxiosRequestConfig,
  ): OperationResponse<Paths.UpdateOperationStatusV1.Responses.$200>;
}

export interface PathsDictionary {
  ['graph-update']: {
    /**
     * announceGraphUpdateV1 - Announce a graph update
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AnnounceGraphUpdateV1.RequestBody,
      config?: AxiosRequestConfig,
    ): OperationResponse<Paths.AnnounceGraphUpdateV1.Responses.$200>;
  };
  ['graph-request-status']: {
    /**
     * updateOperationStatusV1 - Send the status of a requested graph update
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.UpdateOperationStatusV1.RequestBody,
      config?: AxiosRequestConfig,
    ): OperationResponse<Paths.UpdateOperationStatusV1.Responses.$200>;
  };
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>;
