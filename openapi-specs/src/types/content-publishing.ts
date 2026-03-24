import type {
  AxiosRequestConfig,
  OpenAPIClient,
  OperationResponse,
  Parameters,
  UnknownParamsObject,
} from 'openapi-client-axios';

export namespace Components {
  export namespace Schemas {
    export interface AnnouncementResponseDto {
      referenceId: string;
    }
    export interface AssetDto {
      isLink?: boolean;
      references?: [
        AssetReferenceDto,
        ...AssetReferenceDto[]
      ];
      name?: string;
      href?: string; // uri
    }
    export interface AssetReferenceDto {
      referenceId: string;
      height?: number;
      width?: number;
      duration?: string; // DURATION_REGEX
    }
    export interface BatchFileDto {
      schemaId: number;
      cid: string;
    }
    export interface BatchFilesDto {
      batchFiles: BatchFileDto[];
    }
    export interface BroadcastDto {
      content: NoteActivityDto;
    }
    export interface FileResponseDto {
      cid?: string;
      error?: string;
    }
    export interface FilesUploadDto {
      files: string /* binary */[];
    }
    export interface LocationDto {
      units?: LocationDtoUnits;
      name: string;
      accuracy?: number;
      altitude?: number;
      latitude?: number;
      longitude?: number;
      radius?: number;
    }
    export enum ModifiableAnnouncementType {
      Broadcast = "broadcast",
      Reply = "reply",
    }
    export interface NoteActivityDto {
      content: string;
      published: string;
      assets?: AssetDto[];
      name?: string;
      tag?: TagDto[];
      location?: LocationDto;
    }
    export interface OnChainContentDto {
      schemaId: number;
      payload: string; // /^0x/
      published: string;
    }
    export interface ProfileActivityDto {
      icon?: AssetReferenceDto[];
      summary?: string;
      published?: string;
      name?: string;
      tag?: TagDto[];
      location?: LocationDto;
    }
    export interface ProfileDto {
      profile: ProfileActivityDto;
    }
    export interface ReactionDto {
      emoji: string; // DSNP_EMOJI_REGEX
      apply: number;
      inReplyTo: string;
    }
    export interface ReplyDto {
      inReplyTo: string;
      content: NoteActivityDto;
    }
    export interface TagDto {
      type: TagDtoType;
      name?: string;
      mentionedId?: string;
    }
    export enum TagTypeEnum {
      Mention = "mention",
      Hashtag = "hashtag",
    }
    export interface TombstoneDto {
      targetAnnouncementType: TombstoneDtoTargetAnnouncementType;
      targetContentHash: string;
    }
    export enum UnitTypeEnum {
      Cm = "cm",
      M = "m",
      Km = "km",
      Inches = "inches",
      Feet = "feet",
      Miles = "miles",
    }
    export interface UpdateDto {
      targetAnnouncementType: UpdateDtoTargetAnnouncementType;
      targetContentHash: string;
      content: NoteActivityDto;
    }
    export interface UploadResponseDto {
      assetIds: string[];
    }
    export interface UploadResponseDtoV2 {
      files: FileResponseDto[];
    }
    export enum LocationDtoUnits {
      Cm = "cm",
      M = "m",
      Km = "km",
      Inches = "inches",
      Feet = "feet",
      Miles = "miles",
    }

    export enum TagDtoType {
      Mention = "mention",
      Hashtag = "hashtag",
    }

    export enum TombstoneDtoTargetAnnouncementType {
      Broadcast = "broadcast",
      Reply = "reply",
    }

    export enum UpdateDtoTargetAnnouncementType {
      Broadcast = "broadcast",
      Reply = "reply",
    }
  }
}
export namespace Paths {
  export namespace AssetControllerV1AssetUploadV1 {
    export type RequestBody = Components.Schemas.FilesUploadDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.UploadResponseDto;
      export interface $400 {
      }
    }
  }
  export namespace AssetControllerV2UploadFileV2 {
    export type RequestBody = Components.Schemas.FilesUploadDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.UploadResponseDtoV2;
    }
  }
  export namespace ContentControllerV1BroadcastV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export type RequestBody = Components.Schemas.BroadcastDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.AnnouncementResponseDto;
    }
  }
  export namespace ContentControllerV1DeleteV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export type RequestBody = Components.Schemas.TombstoneDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.AnnouncementResponseDto;
    }
  }
  export namespace ContentControllerV1ReactionV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export type RequestBody = Components.Schemas.ReactionDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.AnnouncementResponseDto;
    }
  }
  export namespace ContentControllerV1ReplyV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export type RequestBody = Components.Schemas.ReplyDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.AnnouncementResponseDto;
    }
  }
  export namespace ContentControllerV1UpdateV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export type RequestBody = Components.Schemas.UpdateDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.AnnouncementResponseDto;
    }
  }
  export namespace ContentControllerV2PostBatchesV2 {
    export type RequestBody = Components.Schemas.BatchFilesDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.AnnouncementResponseDto;
    }
  }
  export namespace ContentControllerV2PostContentV2 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export type RequestBody = Components.Schemas.OnChainContentDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.AnnouncementResponseDto;
    }
  }
  export namespace ContentControllerV2PostTombstoneV2 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export type RequestBody = Components.Schemas.TombstoneDto;
    export namespace Responses {
      export type $2XX = Components.Schemas.AnnouncementResponseDto;
    }
  }
  export namespace DevelopmentControllerV1Populate {
    export namespace Parameters {
      export type Count = number;
      export type QueueType = string;
    }
    export interface PathParameters {
      queueType: Parameters.QueueType;
      count: Parameters.Count;
    }
    export namespace Responses {
      export interface $201 {
      }
    }
  }
  export namespace DevelopmentControllerV1RequestJob {
    export namespace Parameters {
      export type JobId = string;
    }
    export interface PathParameters {
      jobId: Parameters.JobId;
    }
    export namespace Responses {
      export interface $200 {
      }
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
  export namespace ProfileControllerV1ProfileV1 {
    export namespace Parameters {
      export type MsaId = string;
    }
    export interface PathParameters {
      msaId: Parameters.MsaId;
    }
    export type RequestBody = Components.Schemas.ProfileDto;
    export namespace Responses {
      export interface $202 {
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
   * AssetControllerV1_assetUpload_v1
   */
  'AssetControllerV1_assetUpload_v1'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AssetControllerV1AssetUploadV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.AssetControllerV1AssetUploadV1.Responses.$2XX>
  /**
   * AssetControllerV2_uploadFile_v2
   */
  'AssetControllerV2_uploadFile_v2'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.AssetControllerV2UploadFileV2.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.AssetControllerV2UploadFileV2.Responses.$2XX>
  /**
   * ContentControllerV1_broadcast_v1
   */
  'ContentControllerV1_broadcast_v1'(
    parameters?: Parameters<Paths.ContentControllerV1BroadcastV1.PathParameters> | null,
    data?: Paths.ContentControllerV1BroadcastV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ContentControllerV1BroadcastV1.Responses.$2XX>
  /**
   * ContentControllerV1_reply_v1
   */
  'ContentControllerV1_reply_v1'(
    parameters?: Parameters<Paths.ContentControllerV1ReplyV1.PathParameters> | null,
    data?: Paths.ContentControllerV1ReplyV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ContentControllerV1ReplyV1.Responses.$2XX>
  /**
   * ContentControllerV1_reaction_v1
   */
  'ContentControllerV1_reaction_v1'(
    parameters?: Parameters<Paths.ContentControllerV1ReactionV1.PathParameters> | null,
    data?: Paths.ContentControllerV1ReactionV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ContentControllerV1ReactionV1.Responses.$2XX>
  /**
   * ContentControllerV1_update_v1
   */
  'ContentControllerV1_update_v1'(
    parameters?: Parameters<Paths.ContentControllerV1UpdateV1.PathParameters> | null,
    data?: Paths.ContentControllerV1UpdateV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ContentControllerV1UpdateV1.Responses.$2XX>
  /**
   * ContentControllerV1_delete_v1
   */
  'ContentControllerV1_delete_v1'(
    parameters?: Parameters<Paths.ContentControllerV1DeleteV1.PathParameters> | null,
    data?: Paths.ContentControllerV1DeleteV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ContentControllerV1DeleteV1.Responses.$2XX>
  /**
   * ContentControllerV2_postContent_v2
   */
  'ContentControllerV2_postContent_v2'(
    parameters?: Parameters<Paths.ContentControllerV2PostContentV2.PathParameters> | null,
    data?: Paths.ContentControllerV2PostContentV2.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ContentControllerV2PostContentV2.Responses.$2XX>
  /**
   * ContentControllerV2_postBatches_v2
   */
  'ContentControllerV2_postBatches_v2'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.ContentControllerV2PostBatchesV2.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ContentControllerV2PostBatchesV2.Responses.$2XX>
  /**
   * ContentControllerV2_postTombstone_v2
   */
  'ContentControllerV2_postTombstone_v2'(
    parameters?: Parameters<Paths.ContentControllerV2PostTombstoneV2.PathParameters> | null,
    data?: Paths.ContentControllerV2PostTombstoneV2.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ContentControllerV2PostTombstoneV2.Responses.$2XX>
  /**
   * ProfileControllerV1_profile_v1
   */
  'ProfileControllerV1_profile_v1'(
    parameters?: Parameters<Paths.ProfileControllerV1ProfileV1.PathParameters> | null,
    data?: Paths.ProfileControllerV1ProfileV1.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.ProfileControllerV1ProfileV1.Responses.$202>
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
   * DevelopmentControllerV1_requestJob
   */
  'DevelopmentControllerV1_requestJob'(
    parameters?: Parameters<Paths.DevelopmentControllerV1RequestJob.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.DevelopmentControllerV1RequestJob.Responses.$200>
  /**
   * DevelopmentControllerV1_populate
   */
  'DevelopmentControllerV1_populate'(
    parameters?: Parameters<Paths.DevelopmentControllerV1Populate.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.DevelopmentControllerV1Populate.Responses.$201>
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
  ['/v1/asset/upload']: {
    /**
     * AssetControllerV1_assetUpload_v1
     */
    'put'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AssetControllerV1AssetUploadV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.AssetControllerV1AssetUploadV1.Responses.$2XX>
  }
  ['/v2/asset/upload']: {
    /**
     * AssetControllerV2_uploadFile_v2
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.AssetControllerV2UploadFileV2.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.AssetControllerV2UploadFileV2.Responses.$2XX>
  }
  ['/v1/content/{msaId}/broadcast']: {
    /**
     * ContentControllerV1_broadcast_v1
     */
    'post'(
      parameters?: Parameters<Paths.ContentControllerV1BroadcastV1.PathParameters> | null,
      data?: Paths.ContentControllerV1BroadcastV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ContentControllerV1BroadcastV1.Responses.$2XX>
  }
  ['/v1/content/{msaId}/reply']: {
    /**
     * ContentControllerV1_reply_v1
     */
    'post'(
      parameters?: Parameters<Paths.ContentControllerV1ReplyV1.PathParameters> | null,
      data?: Paths.ContentControllerV1ReplyV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ContentControllerV1ReplyV1.Responses.$2XX>
  }
  ['/v1/content/{msaId}/reaction']: {
    /**
     * ContentControllerV1_reaction_v1
     */
    'post'(
      parameters?: Parameters<Paths.ContentControllerV1ReactionV1.PathParameters> | null,
      data?: Paths.ContentControllerV1ReactionV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ContentControllerV1ReactionV1.Responses.$2XX>
  }
  ['/v1/content/{msaId}']: {
    /**
     * ContentControllerV1_update_v1
     */
    'put'(
      parameters?: Parameters<Paths.ContentControllerV1UpdateV1.PathParameters> | null,
      data?: Paths.ContentControllerV1UpdateV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ContentControllerV1UpdateV1.Responses.$2XX>
    /**
     * ContentControllerV1_delete_v1
     */
    'delete'(
      parameters?: Parameters<Paths.ContentControllerV1DeleteV1.PathParameters> | null,
      data?: Paths.ContentControllerV1DeleteV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ContentControllerV1DeleteV1.Responses.$2XX>
  }
  ['/v2/content/{msaId}/on-chain']: {
    /**
     * ContentControllerV2_postContent_v2
     */
    'post'(
      parameters?: Parameters<Paths.ContentControllerV2PostContentV2.PathParameters> | null,
      data?: Paths.ContentControllerV2PostContentV2.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ContentControllerV2PostContentV2.Responses.$2XX>
  }
  ['/v2/content/batchAnnouncement']: {
    /**
     * ContentControllerV2_postBatches_v2
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.ContentControllerV2PostBatchesV2.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ContentControllerV2PostBatchesV2.Responses.$2XX>
  }
  ['/v2/content/{msaId}/tombstones']: {
    /**
     * ContentControllerV2_postTombstone_v2
     */
    'post'(
      parameters?: Parameters<Paths.ContentControllerV2PostTombstoneV2.PathParameters> | null,
      data?: Paths.ContentControllerV2PostTombstoneV2.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ContentControllerV2PostTombstoneV2.Responses.$2XX>
  }
  ['/v1/profile/{msaId}']: {
    /**
     * ProfileControllerV1_profile_v1
     */
    'put'(
      parameters?: Parameters<Paths.ProfileControllerV1ProfileV1.PathParameters> | null,
      data?: Paths.ProfileControllerV1ProfileV1.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.ProfileControllerV1ProfileV1.Responses.$202>
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
  ['/dev/request/{jobId}']: {
    /**
     * DevelopmentControllerV1_requestJob
     */
    'get'(
      parameters?: Parameters<Paths.DevelopmentControllerV1RequestJob.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.DevelopmentControllerV1RequestJob.Responses.$200>
  }
  ['/dev/dummy/announcement/{queueType}/{count}']: {
    /**
     * DevelopmentControllerV1_populate
     */
    'post'(
      parameters?: Parameters<Paths.DevelopmentControllerV1Populate.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.DevelopmentControllerV1Populate.Responses.$201>
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


export type AnnouncementResponseDto = Components.Schemas.AnnouncementResponseDto;
export type AssetDto = Components.Schemas.AssetDto;
export type AssetReferenceDto = Components.Schemas.AssetReferenceDto;
export type BatchFileDto = Components.Schemas.BatchFileDto;
export type BatchFilesDto = Components.Schemas.BatchFilesDto;
export type BroadcastDto = Components.Schemas.BroadcastDto;
export type FileResponseDto = Components.Schemas.FileResponseDto;
export type FilesUploadDto = Components.Schemas.FilesUploadDto;
export type LocationDto = Components.Schemas.LocationDto;
export import ModifiableAnnouncementType = Components.Schemas.ModifiableAnnouncementType;
export type NoteActivityDto = Components.Schemas.NoteActivityDto;
export type OnChainContentDto = Components.Schemas.OnChainContentDto;
export type ProfileActivityDto = Components.Schemas.ProfileActivityDto;
export type ProfileDto = Components.Schemas.ProfileDto;
export type ReactionDto = Components.Schemas.ReactionDto;
export type ReplyDto = Components.Schemas.ReplyDto;
export type TagDto = Components.Schemas.TagDto;
export import TagTypeEnum = Components.Schemas.TagTypeEnum;
export type TombstoneDto = Components.Schemas.TombstoneDto;
export import UnitTypeEnum = Components.Schemas.UnitTypeEnum;
export type UpdateDto = Components.Schemas.UpdateDto;
export type UploadResponseDto = Components.Schemas.UploadResponseDto;
export type UploadResponseDtoV2 = Components.Schemas.UploadResponseDtoV2;
