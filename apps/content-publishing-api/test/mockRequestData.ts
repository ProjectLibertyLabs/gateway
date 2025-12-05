// eslint-disable-next-line import/extensions, import/no-unresolved
// import { randomString } from 'https://jslib.k6.io/k6-utils/1.6.0/index.js';

import {
  IAssetMetadata,
  IBroadcast,
  ILocation,
  INoteActivity, IProfile, IProfileActivity,
  IReply,
  ITag,
  ITombstone,
  IUpdate,
  ModifiableAnnouncementType,
} from '#types/interfaces';
import { AttachmentType, TagTypeEnum, UnitTypeEnum } from '#types/enums';

export const validLocation: ILocation = {
  name: 'name of location',
  accuracy: 97,
  altitude: 10,
  latitude: 37.26,
  longitude: -119.59,
  radius: 10,
  units: UnitTypeEnum.M,
};

export const validTags: ITag[] = [
  {
    type: TagTypeEnum.Mention,
    mentionedId: 'dsnp://78187493520',
  },
  {
    type: TagTypeEnum.Hashtag,
    name: '#taggedUser',
  },
];

export const validContentNoUploadedAssets: INoteActivity = {
  content: 'test broadcast message',
  published: '1970-01-01T00:00:00+00:00',
  name: 'name of note content',
  assets: [
    {
      isLink: true,
      name: 'link asset',
      href: 'http://example.com',
    },
  ],
  tag: validTags,
  location: validLocation,
};

export const validBroadCastNoUploadedAssets: IBroadcast = {
  content: validContentNoUploadedAssets,
};

export const validReplyNoUploadedAssets: IReply = {
  content: validContentNoUploadedAssets,
  inReplyTo: 'dsnp://78187493520/bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
};

export const validUpdateNoUploadedAssets: IUpdate = {
  targetContentHash: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
  targetAnnouncementType: ModifiableAnnouncementType.BROADCAST,
  content: validContentNoUploadedAssets
};

export const validReaction = {
  emoji: '🤌🏼',
  apply: 5,
  inReplyTo: 'dsnp://78187493520/bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
};

export const validProfileNoUploadedAssets: IProfileActivity = {
  summary: 'profile summary',
  published: '1970-01-01T00:00:00+00:00',
  name: 'name of profile content',
  tag: validTags,
  location: validLocation,
};

export const validOnChainContent = {
  schemaId: 16001,
  payload: '',
  published: new Date().toISOString(),
};

export const validTombstone: ITombstone = {
  // Target announcement type
  targetAnnouncementType: ModifiableAnnouncementType.BROADCAST,
  // Target DSNP Content Hash
  targetContentHash: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
};

export const assetMetaDataInvalidMimeType: IAssetMetadata = {
  createdOn: 1764863846159,
  dsnpMultiHash: 'bciql7vdn35lqii75qobmkvurjclerrw4myrr7kydkkpjnnxttr7ztxa',
  ipfsCid: 'bafybeiazqzkp7onccu7sgrhsu77w7b23ljcrhis6dknxa5phadhh6fjkai',
  mimeType: 'application/pdf',
  type: AttachmentType.IMAGE,
};

export function generateBroadcast(assets: string[] = []): IBroadcast {
  const payload: IBroadcast = structuredClone(validBroadCastNoUploadedAssets);
  if (assets.length > 0) {
    payload.content.assets.push({ references: assets.map((referenceId) => ({ referenceId })) });
  }
  return payload;
}

export function generateReply(assets: string[] = []): IReply {
  const payload: IReply = structuredClone(validReplyNoUploadedAssets);
  if (assets.length > 0) {
    payload.content.assets.push({ references: assets.map((referenceId) => ({ referenceId })) });
  }
  return payload;
}

export function generateUpdate(assets: string[] = []): IUpdate {
  const payload: IUpdate = structuredClone(validUpdateNoUploadedAssets);
  if (assets.length > 0) {
    payload.content.assets.push({ references: assets.map((referenceId) => ({ referenceId })) });
  }
  return payload;
}

export function generateProfile(assets: string[] = []): IProfile {
  const payload: IProfile = {
    profile: structuredClone(validProfileNoUploadedAssets),
  }
  if (assets.length > 0) {
    payload.profile.icon = assets.map((referenceId) => ({ referenceId }));
  }
  return payload;
}
