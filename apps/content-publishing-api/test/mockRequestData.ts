export const validLocation = {
  name: 'name of location',
  accuracy: 97,
  altitude: 10,
  latitude: 37.26,
  longitude: -119.59,
  radius: 10,
  units: 'm',
};

export const validTags = [
  {
    type: 'mention',
    mentionedId: 'dsnp://78187493520',
  },
  {
    type: 'hashtag',
    name: '#taggedUser',
  },
];

export const validContentNoUploadedAssets = {
  content: 'test broadcast message',
  published: '1970-01-01T00:00:00+00:00',
  name: 'name of note content',
  assets: [
    {
      type: 'link',
      name: 'link asset',
      href: 'http://example.com',
    },
  ],
  tag: validTags,
  location: validLocation,
};

export const validBroadCastNoUploadedAssets = {
  content: validContentNoUploadedAssets,
};

export const validReplyNoUploadedAssets = {
  content: validContentNoUploadedAssets,
  inReplyTo: 'dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

export const validReaction = {
  emoji: '🤌🏼',
  apply: 5,
  inReplyTo: 'dsnp://78187493520/0x1234567890abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

export const validProfileNoUploadedAssets = {
  summary: 'profile summary',
  published: '1970-01-01T00:00:00+00:00',
  name: 'name of profile content',
  tag: validTags,
  location: validLocation,
};
