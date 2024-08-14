/**
 * AnnouncementType: an enum representing different types of DSNP announcements
 */

import { ActivityContentNote } from '@dsnp/activity-content/types';

// eslint-disable-next-line no-shadow
export enum AnnouncementType {
  Tombstone = 0,
  Broadcast = 2,
  Reply = 3,
  Reaction = 4,
  Profile = 5,
  Update = 6,
  PublicFollows = 113,
}

interface TombstoneFields {
  announcementType: AnnouncementType.Tombstone;
  targetAnnouncementType: AnnouncementType;
  targetContentHash: string;
}

interface BroadcastFields {
  announcementType: AnnouncementType.Broadcast;
  contentHash: string;
  url: string;
}

interface ReplyFields {
  announcementType: AnnouncementType.Reply;
  contentHash: string;
  inReplyTo: string;
  url: string;
}

interface ReactionFields {
  announcementType: AnnouncementType.Reaction;
  emoji: string;
  inReplyTo: string;
  apply: number;
}

interface ProfileFields {
  announcementType: AnnouncementType.Profile;
  contentHash: string;
  url: string;
}

interface UpdateFields {
  announcementType: AnnouncementType.Update;
  contentHash: string;
  targetAnnouncementType: AnnouncementType;
  targetContentHash: string;
  url: string;
}

/**
 * TypedAnnouncement: an Announcement with a particular AnnouncementType
 */
export type TypedAnnouncement<T extends AnnouncementType> = {
  announcementType: T;
  fromId: string;
} & (TombstoneFields | BroadcastFields | ReplyFields | ReactionFields | ProfileFields | UpdateFields) &
  Record<string, unknown>;

/**
 * Announcement: an Announcement intended for inclusion in a batch file
 */
export type Announcement = TypedAnnouncement<AnnouncementType>;

/**
 * ProfileAnnouncement: an Announcement of type Profile
 */
export type ProfileAnnouncement = TypedAnnouncement<AnnouncementType.Profile>;

/**
 * TombstoneAnnouncement: an Announcement of type Tombstone
 */
export type TombstoneAnnouncement = TypedAnnouncement<AnnouncementType.Tombstone>;

/**
 * BroadcastAnnouncement: an Announcement of type Broadcast
 */
export type BroadcastAnnouncement = TypedAnnouncement<AnnouncementType.Broadcast>;

/**
 * ReplyAnnouncement: am announcement of type Reply
 */
export type ReplyAnnouncement = TypedAnnouncement<AnnouncementType.Reply>;

/**
 * ReactionAnnouncement: an Announcement of type Reaction
 */
export type ReactionAnnouncement = TypedAnnouncement<AnnouncementType.Reaction>;

/**
 * UpdateAnnouncement: an Announcement of type Update
 */
export type UpdateAnnouncement = TypedAnnouncement<AnnouncementType.Update>;

/**
 * createTombstone() generates a tombstone announcement from a given URL and
 * hash.
 *
 * @param fromId         - The id of the user from whom the announcement is posted
 * @param targetType      - The DSNP announcement type of the target announcement
 * @param targetSignature - The signature of the target announcement
 * @returns A TombstoneAnnouncement
 */
export const createTombstone = (
  fromId: string,
  targetType: AnnouncementType,
  targetContentHash: string,
): TombstoneAnnouncement => ({
  announcementType: AnnouncementType.Tombstone,
  targetAnnouncementType: targetType,
  targetContentHash,
  fromId,
});

/**
 * createBroadcast() generates a broadcast announcement from a given URL and
 * hash.
 *
 * @param fromId   - The id of the user from whom the announcement is posted
 * @param url       - The URL of the activity content to reference
 * @param hash      - The hash of the content at the URL
 * @returns A BroadcastAnnouncement
 */
export const createBroadcast = (fromId: string, url: string, hash: string): BroadcastAnnouncement => ({
  announcementType: AnnouncementType.Broadcast,
  contentHash: hash,
  fromId,
  url,
});

/**
 * createReply() generates a reply announcement from a given URL, hash and
 * content uri.
 *
 * @param fromId   - The id of the user from whom the announcement is posted
 * @param url       - The URL of the activity content to reference
 * @param hash      - The hash of the content at the URL
 * @param inReplyTo - The DSNP Content Uri of the parent announcement
 * @returns A ReplyAnnouncement
 */
export const createReply = (fromId: string, url: string, hash: string, inReplyTo: string): ReplyAnnouncement => ({
  announcementType: AnnouncementType.Reply,
  contentHash: hash,
  fromId,
  inReplyTo,
  url,
});

/**
 * createReaction() generates a reaction announcement from a given URL, hash and
 * content uri.
 *
 * @param fromId   - The id of the user from whom the announcement is posted
 * @param emoji     - The emoji to respond with
 * @param inReplyTo - The DSNP Content Uri of the parent announcement
 * @param apply -
 * @returns A ReactionAnnouncement
 */
export const createReaction = (
  fromId: string,
  emoji: string,
  inReplyTo: string,
  apply: number,
): ReactionAnnouncement => ({
  announcementType: AnnouncementType.Reaction,
  emoji,
  apply,
  fromId,
  inReplyTo,
});

/**
 * createProfile() generates a profile announcement from a given URL and hash.
 *
 * @param fromId   - The id of the user from whom the announcement is posted
 * @param url       - The URL of the activity content to reference
 * @param hash      - The hash of the content at the URL
 * @returns A ProfileAnnouncement
 */
export const createProfile = (fromId: string, url: string, hash: string): ProfileAnnouncement => ({
  announcementType: AnnouncementType.Profile,
  contentHash: hash,
  fromId,
  url,
});

/**
 * createNote() provides a simple factory for generating an ActivityContentNote
 * object.
 * @param content - The text content to include in the note
 * @param published - the Date that the note was claimed to be published
 * @param options - Overrides default fields for the ActivityContentNote
 * @returns An ActivityContentNote object
 */
export const createNote = (
  content: string,
  published: Date,
  options?: Partial<ActivityContentNote>,
): ActivityContentNote => ({
  '@context': 'https://www.w3.org/ns/activitystreams',
  type: 'Note',
  mediaType: 'text/plain',
  published: published.toISOString(),
  content,
  ...options,
});

/**
 * createUpdate() generates an update announcement from a given URL, hash and
 * content uri.
 * @param fromId   - The id of the user from whom the announcement is posted
 * @param url       - The URL of the activity content to reference
 * @param hash      - The hash of the content at the URL
 * @param targetType - The DSNP announcement type of the target announcement
 * @param targetHash - The hash of the target announcement
 * @returns An UpdateAnnouncement
 * @remarks
 * The targetHash is the hash of the target announcement. This is used to
 * ensure that the target announcement has not been modified since the update
 * announcement was created.
 */
export const createUpdate = (
  fromId: string,
  url: string,
  hash: string,
  targetType: AnnouncementType,
  targetHash: string,
): UpdateAnnouncement => ({
  announcementType: AnnouncementType.Update,
  fromId,
  contentHash: hash,
  targetAnnouncementType: targetType,
  targetContentHash: targetHash,
  url,
});
