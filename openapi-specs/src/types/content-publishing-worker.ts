import type {
  AxiosRequestConfig,
  OpenAPIClient,
  OperationResponse,
  Parameters,
  UnknownParamsObject,
} from 'openapi-client-axios';

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
}


export interface OperationMethods {
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



