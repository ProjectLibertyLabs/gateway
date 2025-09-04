import { INoteActivity, IProfileActivity } from './activity.interface';

export enum ModifiableAnnouncementType {
  BROADCAST = 'broadcast',
  REPLY = 'reply',
}

export interface IBroadcast {
  content: INoteActivity;
}

export interface IReply {
  /**
   * Target DSNP Content URI
   */
  inReplyTo: string;

  content: INoteActivity;
}

export interface ITombstone {
  /**
   * Target DSNP Content Hash
   */
  targetContentHash: string;

  targetAnnouncementType: ModifiableAnnouncementType;
}

export interface IUpdate {
  /**
   * Target DSNP Content Hash
   */
  targetContentHash: string;

  targetAnnouncementType: ModifiableAnnouncementType;

  content: INoteActivity;
}

export interface IReaction {
  /**
   * the encoded reaction emoji
   */
  emoji: string;

  /**
   * Indicates whether the emoji should be applied and if so, at what strength
   */
  apply: number;

  /**
   * Target DSNP Content URI
   */
  inReplyTo: string;
}

export interface IProfile {
  profile: IProfileActivity;
}

export interface IBatchFile {
  /**
   * Schema ID for batched off-chain content
   */
  schemaId: number;

  /**
   * Reference ID of off-chain batch file
   */
  cid: string;
}

export interface IBatchFiles {
  batchFiles: IBatchFile[];
}

export interface IBatchAnnouncement {
  /**
   * Unique identifier for tracking the batch announcement
   */
  referenceId?: string;

  /**
   * IPFS CID of the uploaded file
   */
  cid?: string;

  /**
   * Error message if the file upload or batch creation failed
   */
  error?: string;
}

export interface IBatchAnnouncementResponse {
  /**
   * Array of batch announcement results for each uploaded file
   */
  files: IBatchAnnouncement[];
}

export type IRequestType = IBroadcast | IReply | IReaction | IUpdate | IProfile | ITombstone;
export type IAssetIncludedRequest = IBroadcast & IReply & IUpdate & IProfile;
