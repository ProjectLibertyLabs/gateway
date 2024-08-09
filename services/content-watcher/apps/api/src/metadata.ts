/* eslint-disable */
export default async () => {
  const t = {
    ['../../../libs/common/src/dtos/activity.dto']: await import('../../../libs/common/src/dtos/activity.dto'),
    ['../../../libs/common/src/dtos/announcement.dto']: await import('../../../libs/common/src/dtos/announcement.dto'),
    ['../../../libs/common/src/dtos/chain.watch.dto']: await import('../../../libs/common/src/dtos/chain.watch.dto'),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('../../../libs/common/src/dtos/common.dto'),
          {
            DsnpUserIdParam: { userDsnpId: { required: true, type: () => String } },
            AnnouncementResponseDto: { referenceId: { required: true, type: () => String } },
            UploadResponseDto: { assetIds: { required: true, type: () => [String] } },
            FilesUploadDto: { files: { required: true, type: () => [Object] } },
            ResetScannerDto: {
              blockNumber: { required: false, type: () => Number, minimum: 1 },
              rewindOffset: { required: false, type: () => Number },
              immediate: { required: false, type: () => Boolean },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/activity.dto'),
          {
            LocationDto: {
              name: { required: true, type: () => String, minLength: 1 },
              accuracy: { required: false, type: () => Number, minimum: 0, maximum: 100 },
              altitude: { required: false, type: () => Number },
              latitude: { required: false, type: () => Number },
              longitude: { required: false, type: () => Number },
              radius: { required: false, type: () => Number, minimum: 0 },
              units: { required: false, enum: t['../../../libs/common/src/dtos/activity.dto'].UnitTypeDto },
            },
            AssetReferenceDto: {
              referenceId: { required: true, type: () => String, minLength: 1 },
              height: { required: false, type: () => Number, minimum: 1 },
              width: { required: false, type: () => Number, minimum: 1 },
              duration: { required: false, type: () => String, pattern: 'DURATION_REGEX' },
            },
            TagDto: {
              type: { required: true, enum: t['../../../libs/common/src/dtos/activity.dto'].TagTypeDto },
              name: { required: false, type: () => String, minLength: 1 },
              mentionedId: { required: false, type: () => String, minLength: 1, pattern: 'DSNP_USER_URI_REGEX' },
            },
            AssetDto: {
              type: { required: true, enum: t['../../../libs/common/src/dtos/activity.dto'].AttachmentTypeDto },
              references: {
                required: false,
                type: () => [t['../../../libs/common/src/dtos/activity.dto'].AssetReferenceDto],
              },
              name: { required: false, type: () => String, minLength: 1 },
              href: { required: false, type: () => String, minLength: 1 },
            },
            BaseActivityDto: {
              name: { required: false, type: () => String },
              tag: { required: false, type: () => [t['../../../libs/common/src/dtos/activity.dto'].TagDto] },
              location: { required: false, type: () => t['../../../libs/common/src/dtos/activity.dto'].LocationDto },
            },
            NoteActivityDto: {
              content: { required: true, type: () => String, minLength: 1 },
              published: { required: true, type: () => String, pattern: 'ISO8601_REGEX' },
              assets: { required: false, type: () => [t['../../../libs/common/src/dtos/activity.dto'].AssetDto] },
            },
            ProfileActivityDto: {
              icon: {
                required: false,
                type: () => [t['../../../libs/common/src/dtos/activity.dto'].AssetReferenceDto],
              },
              summary: { required: false, type: () => String },
              published: { required: false, type: () => String, pattern: 'ISO8601_REGEX' },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/announcement.dto'),
          {
            BroadcastDto: {
              content: { required: true, type: () => t['../../../libs/common/src/dtos/activity.dto'].NoteActivityDto },
            },
            ReplyDto: {
              inReplyTo: { required: true, type: () => String, pattern: 'DSNP_CONTENT_URI_REGEX' },
              content: { required: true, type: () => t['../../../libs/common/src/dtos/activity.dto'].NoteActivityDto },
            },
            TombstoneDto: {
              targetContentHash: { required: true, type: () => String, pattern: 'DSNP_CONTENT_HASH_REGEX' },
              targetAnnouncementType: {
                required: true,
                enum: t['../../../libs/common/src/dtos/announcement.dto'].ModifiableAnnouncementTypeDto,
              },
            },
            UpdateDto: {
              targetContentHash: { required: true, type: () => String, pattern: 'DSNP_CONTENT_HASH_REGEX' },
              targetAnnouncementType: {
                required: true,
                enum: t['../../../libs/common/src/dtos/announcement.dto'].ModifiableAnnouncementTypeDto,
              },
              content: { required: true, type: () => t['../../../libs/common/src/dtos/activity.dto'].NoteActivityDto },
            },
            ReactionDto: {
              emoji: { required: true, type: () => String, minLength: 1, pattern: 'DSNP_EMOJI_REGEX' },
              apply: { required: true, type: () => Number, minimum: 0, maximum: 255 },
              inReplyTo: { required: true, type: () => String, pattern: 'DSNP_CONTENT_URI_REGEX' },
            },
            ProfileDto: {
              profile: {
                required: true,
                type: () => t['../../../libs/common/src/dtos/activity.dto'].ProfileActivityDto,
              },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/chain.watch.dto'),
          {
            ChainWatchOptionsDto: {
              schemaIds: { required: true, type: () => [Number] },
              dsnpIds: { required: true, type: () => [String] },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/content-search-request.dto'),
          {
            ContentSearchRequestDto: {
              clientReferenceId: { required: true, type: () => String },
              startBlock: { required: true, type: () => Number, minimum: 1 },
              blockCount: { required: true, type: () => Number, minimum: 1 },
              filters: {
                required: true,
                type: () => t['../../../libs/common/src/dtos/chain.watch.dto'].ChainWatchOptionsDto,
              },
              webhookUrl: { required: true, type: () => String },
            },
          },
        ],
        [
          import('../../../libs/common/src/dtos/subscription.webhook.dto'),
          {
            WebhookRegistrationDto: {
              url: { required: true, type: () => String },
              announcementTypes: { required: true, type: () => [String] },
            },
          },
        ],
      ],
      controllers: [
        [import('./controllers/health.controller'), { HealthController: { healthz: {}, livez: {}, readyz: {} } }],
        [
          import('./controllers/v1/scanner.controller'),
          {
            ScanControllerV1: {
              resetScanner: {},
              getWatchOptions: { type: t['../../../libs/common/src/dtos/chain.watch.dto'].ChainWatchOptionsDto },
              setWatchOptions: {},
              pauseScanner: {},
              startScanner: {},
            },
          },
        ],
        [import('./controllers/v1/search.controller'), { SearchControllerV1: { search: {} } }],
        [
          import('./controllers/v1/webhook.controller'),
          { WebhookControllerV1: { registerWebhook: {}, clearAllWebHooks: {}, getRegisteredWebhooks: {} } },
        ],
      ],
    },
  };
};
