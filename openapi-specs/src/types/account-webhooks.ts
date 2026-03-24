import type {
  OpenAPIClient
} from 'openapi-client-axios';

export namespace Components {
  export namespace Schemas {
    export interface PublishGraphKeysOpts {
      schemaId: string;
    }
    export interface PublishGraphKeysWebhookRsp {
      providerId: string;
      referenceId: string;
      msaId: string;
      transactionType?: TransactionType;
      schemaId: string;
    }
    export interface PublishHandleOpts {
      handle: string;
    }
    export interface PublishHandleWebhookRsp {
      providerId: string;
      referenceId: string;
      msaId: string;
      transactionType?: TransactionType;
      handle: string;
    }
    export interface PublishKeysOpts {
      newPublicKey: string;
    }
    export interface PublishKeysWebhookRsp {
      providerId: string;
      referenceId: string;
      msaId: string;
      transactionType?: TransactionType;
      newPublicKey: string;
    }
    export interface RetireMsaWebhookRsp {
      providerId: string;
      referenceId: string;
      msaId: string;
      transactionType?: TransactionType;
    }
    export interface RevokeDelegationWebhookRsp {
      providerId: string;
      referenceId: string;
      msaId: string;
      transactionType?: TransactionType;
    }
    export interface SIWFOpts {
      handle: string;
      accountId: string;
    }
    export interface SIWFWebhookRsp {
      providerId: string;
      referenceId: string;
      msaId: string;
      transactionType?: TransactionType;
      handle: string;
      accountId: string;
    }
    export enum TransactionType {
      CHANGE_HANDLE = "CHANGE_HANDLE",
      CREATE_HANDLE = "CREATE_HANDLE",
      SIWF_SIGNUP = "SIWF_SIGNUP",
      SIWF_SIGNIN = "SIWF_SIGNIN",
      ADD_KEY = "ADD_KEY",
      RETIRE_MSA = "RETIRE_MSA",
      ADD_PUBLIC_KEY_AGREEMENT = "ADD_PUBLIC_KEY_AGREEMENT",
      REVOKE_DELEGATION = "REVOKE_DELEGATION",
      ICS_PUBLISH = "ICS_PUBLISH",
    }
    export type TxWebhookOpts = PublishHandleOpts | SIWFOpts | PublishKeysOpts | PublishGraphKeysOpts;
    export type TxWebhookRsp = PublishHandleWebhookRsp | SIWFWebhookRsp | PublishKeysWebhookRsp | PublishGraphKeysWebhookRsp | RetireMsaWebhookRsp | RevokeDelegationWebhookRsp;
    export interface TxWebhookRspBase {
      providerId: string;
      referenceId: string;
      msaId: string;
      transactionType?: TransactionType;
    }
  }
}
export namespace Paths {
  export namespace TransactionNotify {
    export namespace Post {
      export type RequestBody = Components.Schemas.TxWebhookRsp;
      export namespace Responses {
        export interface $200 {
        }
        export interface $400 {
        }
      }
    }
  }
}


export interface OperationMethods {
}

export interface PathsDictionary {
  ['/transaction-notify']: {
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>


export type PublishGraphKeysOpts = Components.Schemas.PublishGraphKeysOpts;
export type PublishGraphKeysWebhookRsp = Components.Schemas.PublishGraphKeysWebhookRsp;
export type PublishHandleOpts = Components.Schemas.PublishHandleOpts;
export type PublishHandleWebhookRsp = Components.Schemas.PublishHandleWebhookRsp;
export type PublishKeysOpts = Components.Schemas.PublishKeysOpts;
export type PublishKeysWebhookRsp = Components.Schemas.PublishKeysWebhookRsp;
export type RetireMsaWebhookRsp = Components.Schemas.RetireMsaWebhookRsp;
export type RevokeDelegationWebhookRsp = Components.Schemas.RevokeDelegationWebhookRsp;
export type SIWFOpts = Components.Schemas.SIWFOpts;
export type SIWFWebhookRsp = Components.Schemas.SIWFWebhookRsp;
export import TransactionType = Components.Schemas.TransactionType;
export type TxWebhookOpts = Components.Schemas.TxWebhookOpts;
export type TxWebhookRsp = Components.Schemas.TxWebhookRsp;
export type TxWebhookRspBase = Components.Schemas.TxWebhookRspBase;
