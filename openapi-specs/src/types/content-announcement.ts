import type {
  AxiosRequestConfig,
  OpenAPIClient,
  OperationResponse,
  Parameters,
  UnknownParamsObject,
} from 'openapi-client-axios';

export namespace Components {
  export namespace Schemas {
    export interface AnnouncementResponse {
      requestId?: string | null;
      webhookUrl?: string | null;
      schemaId: number;
      blockNumber: number;
      announcement: TombstoneAnnouncement | BroadcastAnnouncement | ReplyAnnouncement | ReactionAnnouncement | ProfileAnnouncement | UpdateAnnouncement;
    }
    export enum AnnouncementType {
      Tombstone = 0,
      Broadcast = 2,
      Reply = 3,
      Reaction = 4,
      Profile = 5,
      Update = 6,
    }
    export interface BroadcastAnnouncement {
      announcementType: AnnouncementType;
      fromId: string;
      contentHash: string;
      url: string;
    }
    export interface ProfileAnnouncement {
      announcementType: AnnouncementType;
      fromId: string;
      contentHash: string;
      url: string;
    }
    export interface ReactionAnnouncement {
      announcementType: AnnouncementType;
      fromId: string;
      emoji: string;
      inReplyTo: string;
      apply: number;
    }
    export interface ReplyAnnouncement {
      announcementType: AnnouncementType;
      fromId: string;
      contentHash: string;
      inReplyTo: string;
      url: string;
    }
    export interface TombstoneAnnouncement {
      announcementType: AnnouncementType;
      fromId: string;
      targetAnnouncementType: number;
      targetContentHash: string;
    }
    export interface TypedAnnouncement {
      announcementType: AnnouncementType;
      fromId: string;
    }
    export interface UpdateAnnouncement {
      announcementType: AnnouncementType;
      fromId: string;
      contentHash: string;
      targetAnnouncementType: number;
      targetContentHash: string;
      url: string;
    }
  }
}
export namespace Paths {
  export namespace CreateAnnouncementResponse {
    export type RequestBody = Components.Schemas.AnnouncementResponse;
    export namespace Responses {
      export interface $201 {
      }
      export interface $400 {
      }
    }
  }
}


export interface OperationMethods {
  /**
   * createAnnouncementResponse
   */
  'createAnnouncementResponse'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.CreateAnnouncementResponse.RequestBody,
    config?: AxiosRequestConfig
  ): OperationResponse<Paths.CreateAnnouncementResponse.Responses.$201>
}

export interface PathsDictionary {
  ['/content-announcements']: {
    /**
     * createAnnouncementResponse
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.CreateAnnouncementResponse.RequestBody,
      config?: AxiosRequestConfig
    ): OperationResponse<Paths.CreateAnnouncementResponse.Responses.$201>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>


export type AnnouncementResponse = Components.Schemas.AnnouncementResponse;
export import AnnouncementType = Components.Schemas.AnnouncementType;
export type BroadcastAnnouncement = Components.Schemas.BroadcastAnnouncement;
export type ProfileAnnouncement = Components.Schemas.ProfileAnnouncement;
export type ReactionAnnouncement = Components.Schemas.ReactionAnnouncement;
export type ReplyAnnouncement = Components.Schemas.ReplyAnnouncement;
export type TombstoneAnnouncement = Components.Schemas.TombstoneAnnouncement;
export type TypedAnnouncement = Components.Schemas.TypedAnnouncement;
export type UpdateAnnouncement = Components.Schemas.UpdateAnnouncement;
