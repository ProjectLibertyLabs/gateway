// eslint-disable-next-line max-classes-per-file
import { INoteActivity, IProfileActivity } from './activity.interface';

// eslint-disable-next-line no-shadow
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
  referenceId: string;
}

export type IRequestType = IBroadcast | IReply | IReaction | IUpdate | IProfile | ITombstone;
export type IAssetIncludedRequest = IBroadcast & IReply & IUpdate & IProfile;
