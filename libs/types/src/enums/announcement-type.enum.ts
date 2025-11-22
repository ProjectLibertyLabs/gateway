// eslint-disable-next-line no-shadow
export enum AnnouncementType {
  Tombstone = 0,
  Broadcast = 2,
  Reply = 3,
  Reaction = 4,
  Profile = 5,
  Update = 6,
}

// eslint-disable-next-line no-shadow
export enum AnnouncementTypeName {
  TOMBSTONE = 'tombstone',
  BROADCAST = 'broadcast',
  REPLY = 'reply',
  REACTION = 'reaction',
  PROFILE = 'profile',
  UPDATE = 'update',
}

export enum HcpRequestType {
  ADD_HCP_PUBLIC_KEY = 0,
}

export enum HcpRequestTypeName {
  ADD_HCP_PUBLIC_KEY = 'addHcpPublicKey',
}
