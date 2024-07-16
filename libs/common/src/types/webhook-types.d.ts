import type { OpenAPIClient, Parameters, UnknownParamsObject, OperationResponse, AxiosRequestConfig } from 'openapi-client-axios';

declare namespace Components {
  namespace Schemas {
    export interface AddKeyUpdate {
      /**
       * type
       */
      type: 'AddKey';
      ownerDsnpUserId: string;
      prevHash: number;
    }
    export interface DeletePageUpdate {
      /**
       * type
       */
      type: 'DeletePage';
      ownerDsnpUserId: string;
      schemaId: number;
      pageId: number;
      prevHash: number;
    }
    export interface GraphChangeNotification {
      /**
       * MSA ID for which this notification is being sent
       * example:
       * 2
       */
      msaId: string;
      /**
       * The payload of the specific update. Content depends on the type of update (Add, Delete, Persist)
       */
      update: /* The payload of the specific update. Content depends on the type of update (Add, Delete, Persist) */ PersistPageUpdate | DeletePageUpdate | AddKeyUpdate;
    }
    export interface GraphOperationStatus {
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
    export interface PersistPageUpdate {
      /**
       * type
       */
      type: 'PersistPage';
      /**
       * MSA of graph owner
       * example:
       * 2
       */
      ownerDsnpUserId: string;
      /**
       * Schema ID of graph schema
       * example:
       * 8
       */
      schemaId: number;
      /**
       * Page ID of graph page being updated
       * example:
       * 1
       */
      pageId: number;
      /**
       * Content hash of last known state of graph page
       * example:
       * 1234567
       */
      prevHash: number;
      /**
       * Byte array of graph page data
       */
      payload: {
        [key: string]: any;
      };
    }
    export interface Uint8Array {}
  }
}

export interface OperationMethods {}

export interface PathsDictionary {}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>;
