import type {
  AxiosRequestConfig,
  OpenAPIClient,
  OperationResponse,
  Parameters,
  UnknownParamsObject,
} from 'openapi-client-axios';

export namespace Components {
  export namespace Schemas {
    export interface AccountResponseDto {
      msaId: string;
      handle?: HandleResponseDto;
    }
    export interface AddNewPublicKeyAgreementPayloadRequest {
      payload: ItemizedSignaturePayloadDto;
      encodedPayload: string;
    }
    export interface AddNewPublicKeyAgreementRequestDto {
      accountId: string;
      payload: ItemizedSignaturePayloadDto;
      proof: string;
    }
    export interface ChangeHandlePayloadRequest {
      payload: HandlePayloadDto;
      encodedPayload: string;
    }
    export interface Delegation {
      providerId: string;
      delegatedIntents: IntentDelegation[];
      revokedAtBlock?: number;
    }
    export interface DelegationResponse {
      msaId: string;
      delegations: Delegation[];
    }
    export interface GraphKeySubject {
      id: string;
      encodedPublicKeyValue: string;
      encodedPrivateKeyValue: string;
      encoding: string;
      format: string;
      type: string;
      keyType: string;
    }
    export interface HandlePayloadDto {
      baseHandle: string;
      expiration: number;
    }
    export interface HandleRequestDto {
      accountId: string;
      payload: HandlePayloadDto;
      proof: string;
    }
    export interface HandleResponseDto {
      base_handle: string;
      canonical_base: string;
      suffix: number;
    }
    export interface IcsPublishAllRequestDto {
      addIcsPublicKeyPayload: AddNewPublicKeyAgreementRequestDto;
      addContextGroupPRIDEntryPayload: AddNewPublicKeyAgreementRequestDto;
      addContentGroupMetadataPayload: UpsertPagePayloadDto;
    }
    export interface IntentDelegation {
      intentId: number;
      revokedAtBlock?: number;
    }
    export interface ItemActionDto {
      type: ItemActionDtoType;
      encodedPayload?: string;
      index?: number;
    }
    export enum ItemActionType {
      ADDITEM = "ADD_ITEM",
      DELETEITEM = "DELETE_ITEM",
    }
    export interface ItemizedSignaturePayloadDto {
      actions: [
        ItemActionDto,
        ...ItemActionDto[]
      ];
      schemaId: number;
      targetHash: number;
      expiration: number;
    }
    export interface KeysRequestDto {
      msaOwnerAddress: string;
      msaOwnerSignature: string;
      newKeyOwnerSignature: string;
      payload: KeysRequestPayloadDto;
    }
    export interface KeysRequestPayloadDto {
      msaId: string;
      expiration: number;
      newPublicKey: string;
    }
    export interface KeysResponse {
      msaKeys: {
        [key: string]: any;
      };
    }
    export interface RetireMsaPayloadResponseDto {
      encodedExtrinsic: string;
      payloadToSign: string;
      accountId: string;
    }
    export interface RetireMsaRequestDto {
      encodedExtrinsic: string;
      payloadToSign: string;
      accountId: string;
      signature: string;
    }
    export interface RevokeDelegationPayloadRequestDto {
      accountId: string;
      providerId: string;
      encodedExtrinsic: string;
      payloadToSign: string;
      signature: string;
    }
    export interface RevokeDelegationPayloadResponseDto {
      accountId: string;
      providerId: string;
      encodedExtrinsic: string;
      payloadToSign: string;
    }
    export interface TransactionResponse {
      state?: string;
      referenceId: string;
    }
    export interface UpsertPagePayloadDto {
      accountId: string;
      signature: string;
      payload: {
        schemaId: number;
        pageId: number;
        targetHash: number;
        expiration: number;
        payload: string;
      };
    }
    export interface UpsertedPageDto {
      schemaId: number;
      pageId: number;
      targetHash: number;
      expiration: number;
      payload: string;
    }
    export interface WalletV2LoginRequestDto {
      authorizationCode?: string;
      authorizationPayload?: string;
    }
    export interface WalletV2LoginResponseDto {
      controlKey: string;
      signUpReferenceId?: string;
      signUpStatus?: string;
      msaId?: string;
      email?: string;
      phoneNumber?: string;
      graphKey?: {
        id: string;
        encodedPublicKeyValue: string;
        encodedPrivateKeyValue: string;
        encoding: string;
        format: string;
        type: string;
        keyType: string;
      };
      recoverySecret?: string;
      rawCredentials?: {
        [key: string]: any;
      }[];
    }
    export interface WalletV2RedirectResponseDto {
      signedRequest: string;
      frequencyRpcUrl: string;
      redirectUrl: string;
    }
    export enum ItemActionDtoType {
      ADDITEM = "ADD_ITEM",
      DELETEITEM = "DELETE_ITEM",
    }
  }
}
export namespace Paths {
  export namespace AccountsControllerV1GetAccountForAccountIdV1 {
    export namespace Parameters {
      export type AccountId = string;
    }
    export interface PathParameters {
      accountId: Parameters.AccountId;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.AccountResponseDto;
    }
  }
  export namespace AccountsControllerV1GetAccountForMsaV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.AccountResponseDto;
    }
  }
  export namespace AccountsControllerV1GetRetireMsaPayloadV1 {
    export namespace Parameters {
      export type AccountId = string;
    }
    export interface PathParameters {
      accountId: Parameters.AccountId;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.RetireMsaPayloadResponseDto;
    }
  }
  export namespace AccountsControllerV1PostRetireMsaV1 {
    export type RequestBody = Components.Schemas.RetireMsaRequestDto;
    export namespace Responses {
      export type $201 = Components.Schemas.TransactionResponse;
    }
  }
  export namespace AccountsControllerV2GetRedirectUrlV2 {
    export namespace Parameters {
      export type CallbackUrl = string;
      export type Credentials = string[];
      export type Permissions = string[];
    }
    export interface QueryParameters {
      credentials?: Parameters.Credentials;
      permissions?: Parameters.Permissions;
      callbackUrl: Parameters.CallbackUrl;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.WalletV2RedirectResponseDto;
    }
  }
  export namespace AccountsControllerV2PostSignInWithFrequencyV2 {
    export type RequestBody = Components.Schemas.WalletV2LoginRequestDto;
    export namespace Responses {
      export type $200 = Components.Schemas.WalletV2LoginResponseDto;
    }
  }
  export namespace BlockInfoControllerBlockInfoV1 {
    export namespace Responses {
      export interface $200 {
      }
    }
  }
  export namespace DelegationsControllerV3GetDelegationV3 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.DelegationResponse;
    }
  }
  export namespace DelegationsControllerV3GetProviderDelegationV3 {
    export namespace Parameters {
      export type MsaId = string;
      export type ProviderId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
      providerId?: Parameters.ProviderId;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.DelegationResponse;
    }
  }
  export namespace DelegationsControllerV3GetRevokeDelegationPayloadV3 {
    export namespace Parameters {
      export type AccountId = string;
      export type ProviderId = string;
    }
    export interface PathParameters {
      accountId: Parameters.AccountId;
      providerId: Parameters.ProviderId;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.RevokeDelegationPayloadResponseDto;
    }
  }
  export namespace DelegationsControllerV3PostRevokeDelegationV3 {
    export type RequestBody = Components.Schemas.RevokeDelegationPayloadRequestDto;
    export namespace Responses {
      export type $201 = Components.Schemas.TransactionResponse;
    }
  }
  export namespace HandlesControllerV1ChangeHandleV1 {
    export type RequestBody = Components.Schemas.HandleRequestDto;
    export namespace Responses {
      export type $200 = Components.Schemas.TransactionResponse;
      export interface $400 {
      }
    }
  }
  export namespace HandlesControllerV1CreateHandleV1 {
    export type RequestBody = Components.Schemas.HandleRequestDto;
    export namespace Responses {
      export type $200 = Components.Schemas.TransactionResponse;
      export interface $400 {
      }
    }
  }
  export namespace HandlesControllerV1GetChangeHandlePayloadV1 {
    export namespace Parameters {
      export type NewHandle = string;
    }
    export interface PathParameters {
      newHandle: Parameters.NewHandle;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.ChangeHandlePayloadRequest;
      export interface $400 {
      }
    }
  }
  export namespace HandlesControllerV1GetHandleV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.HandleResponseDto;
    }
  }
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
  export namespace IcsControllerV1PublishAllV1 {
    export namespace Parameters {
      export type AccountId = string;
    }
    export interface PathParameters {
      accountId: Parameters.AccountId;
    }
    export type RequestBody = Components.Schemas.IcsPublishAllRequestDto;
    export namespace Responses {
      export interface $202 {
      }
    }
  }
  export namespace KeysControllerV1AddKeyV1 {
    export type RequestBody = Components.Schemas.KeysRequestDto;
    export namespace Responses {
      export type $200 = Components.Schemas.TransactionResponse;
    }
  }
  export namespace KeysControllerV1AddNewPublicKeyAgreementsV1 {
    export type RequestBody = Components.Schemas.AddNewPublicKeyAgreementRequestDto;
    export namespace Responses {
      export type $200 = Components.Schemas.TransactionResponse;
    }
  }
  export namespace KeysControllerV1GetKeysV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.KeysResponse;
    }
  }
  export namespace KeysControllerV1GetPublicKeyAgreementsKeyPayloadV1 {
    export namespace Parameters {
      export type MsaId = string;
      export type NewKey = string;
    }
    export interface QueryParameters {
      msaId: Parameters.MsaId;
      newKey: Parameters.NewKey;
    }
    export namespace Responses {
      export type $200 = Components.Schemas.AddNewPublicKeyAgreementPayloadRequest;
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
   * AccountsControllerV2_getRedirectUrl_v2
   */
  'AccountsControllerV2_getRedirectUrl_v2'(
    parameters?: Parameters<Paths.AccountsControllerV2GetRedirectUrlV2.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.AccountsControllerV2GetRedirectUrlV2.Responses.$200>
  /**
   * AccountsControllerV2_postSignInWithFrequency_v2
   */
  'AccountsControllerV2_postSignInWithFrequency_v2'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AccountsControllerV2PostSignInWithFrequencyV2.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.AccountsControllerV2PostSignInWithFrequencyV2.Responses.$200>
  /**
   * AccountsControllerV1_getAccountForMsa_v1
   */
  'AccountsControllerV1_getAccountForMsa_v1'(
    parameters?: Parameters<Paths.AccountsControllerV1GetAccountForMsaV1.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.AccountsControllerV1GetAccountForMsaV1.Responses.$200>
  /**
   * AccountsControllerV1_getAccountForAccountId_v1
   */
  'AccountsControllerV1_getAccountForAccountId_v1'(
    parameters?: Parameters<Paths.AccountsControllerV1GetAccountForAccountIdV1.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.AccountsControllerV1GetAccountForAccountIdV1.Responses.$200>
  /**
   * AccountsControllerV1_getRetireMsaPayload_v1
   */
  'AccountsControllerV1_getRetireMsaPayload_v1'(
    parameters?: Parameters<Paths.AccountsControllerV1GetRetireMsaPayloadV1.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.AccountsControllerV1GetRetireMsaPayloadV1.Responses.$200>
  /**
   * AccountsControllerV1_postRetireMsa_v1
   */
  'AccountsControllerV1_postRetireMsa_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AccountsControllerV1PostRetireMsaV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.AccountsControllerV1PostRetireMsaV1.Responses.$201>
  /**
   * DelegationsControllerV3_getDelegation_v3
   */
  'DelegationsControllerV3_getDelegation_v3'(
    parameters?: Parameters<Paths.DelegationsControllerV3GetDelegationV3.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.DelegationsControllerV3GetDelegationV3.Responses.$200>
  /**
   * DelegationsControllerV3_getProviderDelegation_v3
   */
  'DelegationsControllerV3_getProviderDelegation_v3'(
    parameters?: Parameters<Paths.DelegationsControllerV3GetProviderDelegationV3.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.DelegationsControllerV3GetProviderDelegationV3.Responses.$200>
  /**
   * DelegationsControllerV3_getRevokeDelegationPayload_v3
   */
  'DelegationsControllerV3_getRevokeDelegationPayload_v3'(
    parameters?: Parameters<Paths.DelegationsControllerV3GetRevokeDelegationPayloadV3.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.DelegationsControllerV3GetRevokeDelegationPayloadV3.Responses.$200>
  /**
   * DelegationsControllerV3_postRevokeDelegation_v3
   */
  'DelegationsControllerV3_postRevokeDelegation_v3'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.DelegationsControllerV3PostRevokeDelegationV3.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.DelegationsControllerV3PostRevokeDelegationV3.Responses.$201>
  /**
   * HandlesControllerV1_createHandle_v1
   */
  'HandlesControllerV1_createHandle_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.HandlesControllerV1CreateHandleV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.HandlesControllerV1CreateHandleV1.Responses.$200>
  /**
   * HandlesControllerV1_changeHandle_v1
   */
  'HandlesControllerV1_changeHandle_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.HandlesControllerV1ChangeHandleV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.HandlesControllerV1ChangeHandleV1.Responses.$200>
  /**
   * HandlesControllerV1_getChangeHandlePayload_v1
   */
  'HandlesControllerV1_getChangeHandlePayload_v1'(
    parameters?: Parameters<Paths.HandlesControllerV1GetChangeHandlePayloadV1.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.HandlesControllerV1GetChangeHandlePayloadV1.Responses.$200>
  /**
   * HandlesControllerV1_getHandle_v1
   */
  'HandlesControllerV1_getHandle_v1'(
    parameters?: Parameters<Paths.HandlesControllerV1GetHandleV1.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.HandlesControllerV1GetHandleV1.Responses.$200>
  /**
   * KeysControllerV1_addKey_v1
   */
  'KeysControllerV1_addKey_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.KeysControllerV1AddKeyV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.KeysControllerV1AddKeyV1.Responses.$200>
  /**
   * KeysControllerV1_getKeys_v1
   */
  'KeysControllerV1_getKeys_v1'(
    parameters?: Parameters<Paths.KeysControllerV1GetKeysV1.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.KeysControllerV1GetKeysV1.Responses.$200>
  /**
   * KeysControllerV1_getPublicKeyAgreementsKeyPayload_v1
   */
  'KeysControllerV1_getPublicKeyAgreementsKeyPayload_v1'(
    parameters?: Parameters<Paths.KeysControllerV1GetPublicKeyAgreementsKeyPayloadV1.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.KeysControllerV1GetPublicKeyAgreementsKeyPayloadV1.Responses.$200>
  /**
   * KeysControllerV1_addNewPublicKeyAgreements_v1
   */
  'KeysControllerV1_addNewPublicKeyAgreements_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.KeysControllerV1AddNewPublicKeyAgreementsV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.KeysControllerV1AddNewPublicKeyAgreementsV1.Responses.$200>
  /**
   * IcsControllerV1_publishAll_v1
   */
  'IcsControllerV1_publishAll_v1'(
    parameters?: Parameters<Paths.IcsControllerV1PublishAllV1.PathParameters> | null,
    data?: Paths.IcsControllerV1PublishAllV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.IcsControllerV1PublishAllV1.Responses.$202>
  /**
   * BlockInfoController_blockInfo_v1
   */
  'BlockInfoController_blockInfo_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.BlockInfoControllerBlockInfoV1.Responses.$200>
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
  ['/v2/accounts/siwf']: {
    /**
     * AccountsControllerV2_getRedirectUrl_v2
     */
    'get'(
      parameters?: Parameters<Paths.AccountsControllerV2GetRedirectUrlV2.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.AccountsControllerV2GetRedirectUrlV2.Responses.$200>
    /**
     * AccountsControllerV2_postSignInWithFrequency_v2
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AccountsControllerV2PostSignInWithFrequencyV2.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.AccountsControllerV2PostSignInWithFrequencyV2.Responses.$200>
  }
  ['/v1/accounts/{msaId}']: {
    /**
     * AccountsControllerV1_getAccountForMsa_v1
     */
    'get'(
      parameters?: Parameters<Paths.AccountsControllerV1GetAccountForMsaV1.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.AccountsControllerV1GetAccountForMsaV1.Responses.$200>
  }
  ['/v1/accounts/account/{accountId}']: {
    /**
     * AccountsControllerV1_getAccountForAccountId_v1
     */
    'get'(
      parameters?: Parameters<Paths.AccountsControllerV1GetAccountForAccountIdV1.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.AccountsControllerV1GetAccountForAccountIdV1.Responses.$200>
  }
  ['/v1/accounts/retireMsa/{accountId}']: {
    /**
     * AccountsControllerV1_getRetireMsaPayload_v1
     */
    'get'(
      parameters?: Parameters<Paths.AccountsControllerV1GetRetireMsaPayloadV1.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.AccountsControllerV1GetRetireMsaPayloadV1.Responses.$200>
  }
  ['/v1/accounts/retireMsa']: {
    /**
     * AccountsControllerV1_postRetireMsa_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AccountsControllerV1PostRetireMsaV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.AccountsControllerV1PostRetireMsaV1.Responses.$201>
  }
  ['/v3/delegations/{msaId}']: {
    /**
     * DelegationsControllerV3_getDelegation_v3
     */
    'get'(
      parameters?: Parameters<Paths.DelegationsControllerV3GetDelegationV3.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.DelegationsControllerV3GetDelegationV3.Responses.$200>
  }
  ['/v3/delegations/{msaId}/{providerId}']: {
    /**
     * DelegationsControllerV3_getProviderDelegation_v3
     */
    'get'(
      parameters?: Parameters<Paths.DelegationsControllerV3GetProviderDelegationV3.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.DelegationsControllerV3GetProviderDelegationV3.Responses.$200>
  }
  ['/v3/delegations/revokeDelegation/{accountId}/{providerId}']: {
    /**
     * DelegationsControllerV3_getRevokeDelegationPayload_v3
     */
    'get'(
      parameters?: Parameters<Paths.DelegationsControllerV3GetRevokeDelegationPayloadV3.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.DelegationsControllerV3GetRevokeDelegationPayloadV3.Responses.$200>
  }
  ['/v3/delegations/revokeDelegation']: {
    /**
     * DelegationsControllerV3_postRevokeDelegation_v3
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.DelegationsControllerV3PostRevokeDelegationV3.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.DelegationsControllerV3PostRevokeDelegationV3.Responses.$201>
  }
  ['/v1/handles']: {
    /**
     * HandlesControllerV1_createHandle_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.HandlesControllerV1CreateHandleV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.HandlesControllerV1CreateHandleV1.Responses.$200>
  }
  ['/v1/handles/change']: {
    /**
     * HandlesControllerV1_changeHandle_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.HandlesControllerV1ChangeHandleV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.HandlesControllerV1ChangeHandleV1.Responses.$200>
  }
  ['/v1/handles/change/{newHandle}']: {
    /**
     * HandlesControllerV1_getChangeHandlePayload_v1
     */
    'get'(
      parameters?: Parameters<Paths.HandlesControllerV1GetChangeHandlePayloadV1.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.HandlesControllerV1GetChangeHandlePayloadV1.Responses.$200>
  }
  ['/v1/handles/{msaId}']: {
    /**
     * HandlesControllerV1_getHandle_v1
     */
    'get'(
      parameters?: Parameters<Paths.HandlesControllerV1GetHandleV1.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.HandlesControllerV1GetHandleV1.Responses.$200>
  }
  ['/v1/keys/add']: {
    /**
     * KeysControllerV1_addKey_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.KeysControllerV1AddKeyV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.KeysControllerV1AddKeyV1.Responses.$200>
  }
  ['/v1/keys/{msaId}']: {
    /**
     * KeysControllerV1_getKeys_v1
     */
    'get'(
      parameters?: Parameters<Paths.KeysControllerV1GetKeysV1.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.KeysControllerV1GetKeysV1.Responses.$200>
  }
  ['/v1/keys/publicKeyAgreements/getAddKeyPayload']: {
    /**
     * KeysControllerV1_getPublicKeyAgreementsKeyPayload_v1
     */
    'get'(
      parameters?: Parameters<Paths.KeysControllerV1GetPublicKeyAgreementsKeyPayloadV1.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.KeysControllerV1GetPublicKeyAgreementsKeyPayloadV1.Responses.$200>
  }
  ['/v1/keys/publicKeyAgreements']: {
    /**
     * KeysControllerV1_addNewPublicKeyAgreements_v1
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.KeysControllerV1AddNewPublicKeyAgreementsV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.KeysControllerV1AddNewPublicKeyAgreementsV1.Responses.$200>
  }
  ['/v1/ics/{accountId}/publishAll']: {
    /**
     * IcsControllerV1_publishAll_v1
     */
    'post'(
      parameters?: Parameters<Paths.IcsControllerV1PublishAllV1.PathParameters> | null,
      data?: Paths.IcsControllerV1PublishAllV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.IcsControllerV1PublishAllV1.Responses.$202>
  }
  ['/v1/frequency/blockinfo']: {
    /**
     * BlockInfoController_blockInfo_v1
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.BlockInfoControllerBlockInfoV1.Responses.$200>
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


export type AccountResponseDto = Components.Schemas.AccountResponseDto;
export type AddNewPublicKeyAgreementPayloadRequest = Components.Schemas.AddNewPublicKeyAgreementPayloadRequest;
export type AddNewPublicKeyAgreementRequestDto = Components.Schemas.AddNewPublicKeyAgreementRequestDto;
export type ChangeHandlePayloadRequest = Components.Schemas.ChangeHandlePayloadRequest;
export type Delegation = Components.Schemas.Delegation;
export type DelegationResponse = Components.Schemas.DelegationResponse;
export type GraphKeySubject = Components.Schemas.GraphKeySubject;
export type HandlePayloadDto = Components.Schemas.HandlePayloadDto;
export type HandleRequestDto = Components.Schemas.HandleRequestDto;
export type HandleResponseDto = Components.Schemas.HandleResponseDto;
export type IcsPublishAllRequestDto = Components.Schemas.IcsPublishAllRequestDto;
export type IntentDelegation = Components.Schemas.IntentDelegation;
export type ItemActionDto = Components.Schemas.ItemActionDto;
export import ItemActionType = Components.Schemas.ItemActionType;
export type ItemizedSignaturePayloadDto = Components.Schemas.ItemizedSignaturePayloadDto;
export type KeysRequestDto = Components.Schemas.KeysRequestDto;
export type KeysRequestPayloadDto = Components.Schemas.KeysRequestPayloadDto;
export type KeysResponse = Components.Schemas.KeysResponse;
export type RetireMsaPayloadResponseDto = Components.Schemas.RetireMsaPayloadResponseDto;
export type RetireMsaRequestDto = Components.Schemas.RetireMsaRequestDto;
export type RevokeDelegationPayloadRequestDto = Components.Schemas.RevokeDelegationPayloadRequestDto;
export type RevokeDelegationPayloadResponseDto = Components.Schemas.RevokeDelegationPayloadResponseDto;
export type TransactionResponse = Components.Schemas.TransactionResponse;
export type UpsertPagePayloadDto = Components.Schemas.UpsertPagePayloadDto;
export type UpsertedPageDto = Components.Schemas.UpsertedPageDto;
export type WalletV2LoginRequestDto = Components.Schemas.WalletV2LoginRequestDto;
export type WalletV2LoginResponseDto = Components.Schemas.WalletV2LoginResponseDto;
export type WalletV2RedirectResponseDto = Components.Schemas.WalletV2RedirectResponseDto;
