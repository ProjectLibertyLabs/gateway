import type {
  AxiosRequestConfig,
  OpenAPIClient,
  OperationResponse,
  Parameters,
  UnknownParamsObject,
} from 'openapi-client-axios';

export namespace Components {
  export namespace Schemas {
    export enum AnnouncementTypeName {
      Tombstone = "tombstone",
      Broadcast = "broadcast",
      Reply = "reply",
      Reaction = "reaction",
      Profile = "profile",
      Update = "update",
    }
    export interface ChainWatchOptionsDto {
      intentIds?: [
        number,
        ...number[]
      ];
      dsnpIds?: [
        string,
        ...string[]
      ];
    }
    export interface ContentSearchRequestDto {
      clientReferenceId?: string;
      upperBoundBlock?: number;
      blockCount: number;
      filters?: {
        intentIds?: [
          number,
          ...number[]
        ];
        dsnpIds?: [
          string,
          ...string[]
        ];
      };
      webhookUrl: string; // uri
    }
    export enum HttpStatus {
      Value100 = 100,
      Value101 = 101,
      Value102 = 102,
      Value103 = 103,
      Value200 = 200,
      Value201 = 201,
      Value202 = 202,
      Value203 = 203,
      Value204 = 204,
      Value205 = 205,
      Value206 = 206,
      Value207 = 207,
      Value208 = 208,
      Value210 = 210,
      Value300 = 300,
      Value301 = 301,
      Value302 = 302,
      Value303 = 303,
      Value304 = 304,
      Value307 = 307,
      Value308 = 308,
      Value400 = 400,
      Value401 = 401,
      Value402 = 402,
      Value403 = 403,
      Value404 = 404,
      Value405 = 405,
      Value406 = 406,
      Value407 = 407,
      Value408 = 408,
      Value409 = 409,
      Value410 = 410,
      Value411 = 411,
      Value412 = 412,
      Value413 = 413,
      Value414 = 414,
      Value415 = 415,
      Value416 = 416,
      Value417 = 417,
      Value418 = 418,
      Value421 = 421,
      Value422 = 422,
      Value423 = 423,
      Value424 = 424,
      Value428 = 428,
      Value429 = 429,
      Value456 = 456,
      Value500 = 500,
      Value501 = 501,
      Value502 = 502,
      Value503 = 503,
      Value504 = 504,
      Value505 = 505,
      Value507 = 507,
      Value508 = 508,
    }
    export interface ResetScannerDto {
      blockNumber?: number;
      rewindOffset?: number;
      immediate?: boolean;
    }
    export interface SearchResponseDto {
      status: SearchResponseDtoStatus;
      jobId: string;
    }
    export interface WebhookRegistrationDto {
      announcementTypes: [
        AnnouncementTypeName,
        ...AnnouncementTypeName[]
      ];
      url: string; // uri
    }
    export interface WebhookRegistrationResponseDto {
      status: WebhookRegistrationResponseDtoStatus;
      registeredWebhooks: WebhookRegistrationDto[];
    }
    export enum SearchResponseDtoStatus {
      Value100 = 100,
      Value101 = 101,
      Value102 = 102,
      Value103 = 103,
      Value200 = 200,
      Value201 = 201,
      Value202 = 202,
      Value203 = 203,
      Value204 = 204,
      Value205 = 205,
      Value206 = 206,
      Value207 = 207,
      Value208 = 208,
      Value210 = 210,
      Value300 = 300,
      Value301 = 301,
      Value302 = 302,
      Value303 = 303,
      Value304 = 304,
      Value307 = 307,
      Value308 = 308,
      Value400 = 400,
      Value401 = 401,
      Value402 = 402,
      Value403 = 403,
      Value404 = 404,
      Value405 = 405,
      Value406 = 406,
      Value407 = 407,
      Value408 = 408,
      Value409 = 409,
      Value410 = 410,
      Value411 = 411,
      Value412 = 412,
      Value413 = 413,
      Value414 = 414,
      Value415 = 415,
      Value416 = 416,
      Value417 = 417,
      Value418 = 418,
      Value421 = 421,
      Value422 = 422,
      Value423 = 423,
      Value424 = 424,
      Value428 = 428,
      Value429 = 429,
      Value456 = 456,
      Value500 = 500,
      Value501 = 501,
      Value502 = 502,
      Value503 = 503,
      Value504 = 504,
      Value505 = 505,
      Value507 = 507,
      Value508 = 508,
    }

    export enum WebhookRegistrationResponseDtoStatus {
      Value100 = 100,
      Value101 = 101,
      Value102 = 102,
      Value103 = 103,
      Value200 = 200,
      Value201 = 201,
      Value202 = 202,
      Value203 = 203,
      Value204 = 204,
      Value205 = 205,
      Value206 = 206,
      Value207 = 207,
      Value208 = 208,
      Value210 = 210,
      Value300 = 300,
      Value301 = 301,
      Value302 = 302,
      Value303 = 303,
      Value304 = 304,
      Value307 = 307,
      Value308 = 308,
      Value400 = 400,
      Value401 = 401,
      Value402 = 402,
      Value403 = 403,
      Value404 = 404,
      Value405 = 405,
      Value406 = 406,
      Value407 = 407,
      Value408 = 408,
      Value409 = 409,
      Value410 = 410,
      Value411 = 411,
      Value412 = 412,
      Value413 = 413,
      Value414 = 414,
      Value415 = 415,
      Value416 = 416,
      Value417 = 417,
      Value418 = 418,
      Value421 = 421,
      Value422 = 422,
      Value423 = 423,
      Value424 = 424,
      Value428 = 428,
      Value429 = 429,
      Value456 = 456,
      Value500 = 500,
      Value501 = 501,
      Value502 = 502,
      Value503 = 503,
      Value504 = 504,
      Value505 = 505,
      Value507 = 507,
      Value508 = 508,
    }
  }
}
export namespace Paths {
  export namespace HealthControllerHealthz {
    export namespace Responses {
      export interface $200 {
      }
    }
  }
  export namespace HealthControllerLivez {
    export namespace Responses {
      export interface $200 {
      }
    }
  }
  export namespace HealthControllerReadyz {
    export namespace Responses {
      export interface $200 {
      }
    }
  }
  export namespace PrometheusControllerIndex {
    export namespace Responses {
      export interface $200 {
      }
    }
  }
  export namespace ScanControllerV1GetWatchOptionsV1 {
    export namespace Responses {
      export type $200 = Components.Schemas.ChainWatchOptionsDto;
    }
  }
  export namespace ScanControllerV1PauseScannerV1 {
    export namespace Responses {
      export interface $201 {
      }
    }
  }
  export namespace ScanControllerV1ResetScannerV1 {
    export type RequestBody = Components.Schemas.ResetScannerDto;
    export namespace Responses {
      export interface $201 {
      }
    }
  }
  export namespace ScanControllerV1SetWatchOptionsV1 {
    export type RequestBody = Components.Schemas.ChainWatchOptionsDto;
    export namespace Responses {
      export interface $201 {
      }
    }
  }
  export namespace ScanControllerV1StartScannerV1 {
    export namespace Parameters {
      export type Immediate = boolean;
    }
    export interface QueryParameters {
      immediate?: Parameters.Immediate;
    }
    export namespace Responses {
      export interface $201 {
      }
    }
  }
  export namespace SearchControllerV1SearchV1 {
    export type RequestBody = Components.Schemas.ContentSearchRequestDto;
    export namespace Responses {
      export type $200 = Components.Schemas.SearchResponseDto;
    }
  }
  export namespace WebhookControllerV1ClearAllWebHooksV1 {
    export namespace Responses {
      export interface $200 {
      }
    }
  }
  export namespace WebhookControllerV1GetRegisteredWebhooksV1 {
    export namespace Responses {
      export type $200 = Components.Schemas.WebhookRegistrationResponseDto;
    }
  }
  export namespace WebhookControllerV1RegisterWebhookV1 {
    export type RequestBody = Components.Schemas.WebhookRegistrationDto;
    export namespace Responses {
      export interface $201 {
      }
    }
  }
}


export interface OperationMethods {
  /**
   * ScanControllerV1_resetScanner_v1
   */
  'ScanControllerV1_resetScanner_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.ScanControllerV1ResetScannerV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ScanControllerV1ResetScannerV1.Responses.$201>
  /**
   * ScanControllerV1_getWatchOptions_v1
   */
  'ScanControllerV1_getWatchOptions_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ScanControllerV1GetWatchOptionsV1.Responses.$200>
  /**
   * ScanControllerV1_setWatchOptions_v1
   */
  'ScanControllerV1_setWatchOptions_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.ScanControllerV1SetWatchOptionsV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ScanControllerV1SetWatchOptionsV1.Responses.$201>
  /**
   * ScanControllerV1_pauseScanner_v1
   */
  'ScanControllerV1_pauseScanner_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ScanControllerV1PauseScannerV1.Responses.$201>
  /**
   * ScanControllerV1_startScanner_v1
   */
  'ScanControllerV1_startScanner_v1'(
    parameters?: Parameters<Paths.ScanControllerV1StartScannerV1.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ScanControllerV1StartScannerV1.Responses.$201>
  /**
   * SearchControllerV1_search_v1
   */
  'SearchControllerV1_search_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.SearchControllerV1SearchV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.SearchControllerV1SearchV1.Responses.$200>
  /**
   * WebhookControllerV1_getRegisteredWebhooks_v1
   */
  'WebhookControllerV1_getRegisteredWebhooks_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.WebhookControllerV1GetRegisteredWebhooksV1.Responses.$200>
  /**
   * WebhookControllerV1_registerWebhook_v1
   */
  'WebhookControllerV1_registerWebhook_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.WebhookControllerV1RegisterWebhookV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.WebhookControllerV1RegisterWebhookV1.Responses.$201>
  /**
   * WebhookControllerV1_clearAllWebHooks_v1
   */
  'WebhookControllerV1_clearAllWebHooks_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.WebhookControllerV1ClearAllWebHooksV1.Responses.$200>
  /**
   * HealthController_healthz
   */
  'HealthController_healthz'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.HealthControllerHealthz.Responses.$200>
  /**
   * HealthController_livez
   */
  'HealthController_livez'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.HealthControllerLivez.Responses.$200>
  /**
   * HealthController_readyz
   */
  'HealthController_readyz'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.HealthControllerReadyz.Responses.$200>
  /**
   * PrometheusController_index
   */
  'PrometheusController_index'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.PrometheusControllerIndex.Responses.$200>
}

export interface PathsDictionary {
  ['/v1/scanner/reset']: {
    /**
     * ScanControllerV1_resetScanner_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.ScanControllerV1ResetScannerV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ScanControllerV1ResetScannerV1.Responses.$201>
  }
  ['/v1/scanner/options']: {
    /**
     * ScanControllerV1_getWatchOptions_v1
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ScanControllerV1GetWatchOptionsV1.Responses.$200>
    /**
     * ScanControllerV1_setWatchOptions_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.ScanControllerV1SetWatchOptionsV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ScanControllerV1SetWatchOptionsV1.Responses.$201>
  }
  ['/v1/scanner/pause']: {
    /**
     * ScanControllerV1_pauseScanner_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ScanControllerV1PauseScannerV1.Responses.$201>
  }
  ['/v1/scanner/start']: {
    /**
     * ScanControllerV1_startScanner_v1
     */
    'post'(
      parameters?: Parameters<Paths.ScanControllerV1StartScannerV1.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ScanControllerV1StartScannerV1.Responses.$201>
  }
  ['/v1/search']: {
    /**
     * SearchControllerV1_search_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.SearchControllerV1SearchV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.SearchControllerV1SearchV1.Responses.$200>
  }
  ['/v1/webhooks']: {
    /**
     * WebhookControllerV1_registerWebhook_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.WebhookControllerV1RegisterWebhookV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.WebhookControllerV1RegisterWebhookV1.Responses.$201>
    /**
     * WebhookControllerV1_clearAllWebHooks_v1
     */
    'delete'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.WebhookControllerV1ClearAllWebHooksV1.Responses.$200>
    /**
     * WebhookControllerV1_getRegisteredWebhooks_v1
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.WebhookControllerV1GetRegisteredWebhooksV1.Responses.$200>
  }
  ['/healthz']: {
    /**
     * HealthController_healthz
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.HealthControllerHealthz.Responses.$200>
  }
  ['/livez']: {
    /**
     * HealthController_livez
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.HealthControllerLivez.Responses.$200>
  }
  ['/readyz']: {
    /**
     * HealthController_readyz
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.HealthControllerReadyz.Responses.$200>
  }
  ['/metrics']: {
    /**
     * PrometheusController_index
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.PrometheusControllerIndex.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>


export import AnnouncementTypeName = Components.Schemas.AnnouncementTypeName;
export type ChainWatchOptionsDto = Components.Schemas.ChainWatchOptionsDto;
export type ContentSearchRequestDto = Components.Schemas.ContentSearchRequestDto;
export import HttpStatus = Components.Schemas.HttpStatus;
export type ResetScannerDto = Components.Schemas.ResetScannerDto;
export type SearchResponseDto = Components.Schemas.SearchResponseDto;
export type WebhookRegistrationDto = Components.Schemas.WebhookRegistrationDto;
export type WebhookRegistrationResponseDto = Components.Schemas.WebhookRegistrationResponseDto;
