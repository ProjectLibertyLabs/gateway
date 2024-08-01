import {
  AnnouncementType,
  BroadcastAnnouncement,
  ProfileAnnouncement,
  ReactionAnnouncement,
  ReplyAnnouncement,
  TombstoneAnnouncement,
  TypedAnnouncement,
  UpdateAnnouncement,
} from '../types/content-announcement';

export function isTypedAnnouncement(obj: object): obj is TypedAnnouncement {
  if ('announcementType' in obj) {
    return true;
  }

  return false;
}
export function isTombstone(obj: object): obj is TombstoneAnnouncement {
  return isTypedAnnouncement(obj) && obj.announcementType === AnnouncementType.Tombstone;
}

export function isBroadcast(obj: object): obj is BroadcastAnnouncement {
  return isTypedAnnouncement(obj) && obj.announcementType === AnnouncementType.Broadcast;
}

export function isReply(obj: object): obj is ReplyAnnouncement {
  return isTypedAnnouncement(obj) && obj.announcementType === AnnouncementType.Reply;
}

export function isReaction(obj: object): obj is ReactionAnnouncement {
  return isTypedAnnouncement(obj) && obj.announcementType === AnnouncementType.Reaction;
}

export function isUpdate(obj: object): obj is UpdateAnnouncement {
  return isTypedAnnouncement(obj) && obj.announcementType === AnnouncementType.Update;
}

export function isProfile(obj: object): obj is ProfileAnnouncement {
  return isTypedAnnouncement(obj) && obj.announcementType === AnnouncementType.Profile;
}
