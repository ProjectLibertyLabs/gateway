import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { ApiModule } from '../src/api.module';
import {
  assetMetaDataInvalidMimeType,
  AVRO_SCHEMA,
  generateBroadcast,
  generateProfile,
  generateReply,
  generateUpdate,
  randomFile30K,
  sleep,
  validBroadCastNoUploadedAssets,
  validContentWithNoAssets,
  validLocation,
  validOnChainContent,
  validProfileNoUploadedAssets,
  validReaction,
  validReplyNoUploadedAssets,
  validTombstone,
  validUpdateNoUploadedAssets,
} from './mockRequestData';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, PinoLogger } from 'nestjs-pino';
import {
  CONFIGURED_QUEUE_NAMES_PROVIDER,
  CONFIGURED_QUEUE_PREFIX_PROVIDER,
  ContentPublisherRedisConstants,
  ContentPublishingQueues as QueueConstants,
} from '#types/constants';
import Redis from 'ioredis';
import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';
import { TagTypeEnum } from '#types/enums';
import getAssetMetadataKey = ContentPublisherRedisConstants.getAssetMetadataKey;
import { base32 } from 'multiformats/bases/base32';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';
import { ApiPromise } from '@polkadot/api';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { getPinoHttpOptions } from '#logger-lib';

let aliceKeys: KeyringPair;

const randomString = (length: number) =>
  randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

const msaId = '123';

validOnChainContent.payload = randomString(1024);

describe('Content Publishing /content Controller E2E Tests', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let redis: Redis;
  let api: ApiPromise;
  let blockchainService: BlockchainRpcQueryService;

  const missingAssetId = '9876543210';
  const badMimeTypeReferenceId = '0123456789';

  beforeAll(async () => {
    await cryptoWaitReady();
    aliceKeys = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');

    module = await Test.createTestingModule({
      imports: [ApiModule],
      providers: [
        {
          provide: CONFIGURED_QUEUE_NAMES_PROVIDER,
          useValue: QueueConstants.CONFIGURED_QUEUES.queues.map(({ name }) => name),
        },
        {
          provide: CONFIGURED_QUEUE_PREFIX_PROVIDER,
          useValue: 'content-publishing::bull',
        },
      ],
    }).compile();

    // To enable logging in tests, set ENABLE_LOGS_IN_TESTS=true in the environment
    app = module.createNestApplication({ logger: new Logger(new PinoLogger(getPinoHttpOptions()), {}) });
    app.useLogger(app.get(Logger));

    const config = app.get<IContentPublishingApiConfig>(apiConfig.KEY);
    app.enableVersioning({ type: VersioningType.URI });
    app.enableShutdownHooks();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        enableDebugMessages: true,
      }),
    );
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });
    app.useLogger(app.get(Logger));

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();

    redis = app.get<Redis>(getRedisToken(DEFAULT_REDIS_NAMESPACE));

    // Modify the asset cache with a disallowed MIME type asset
    await redis.set(getAssetMetadataKey(badMimeTypeReferenceId), JSON.stringify(assetMetaDataInvalidMimeType));
    blockchainService = app.get(BlockchainRpcQueryService);
    api = (await blockchainService.getApi()) as ApiPromise;
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  });

  describe('/v1/content and /v1/profile', () => {
    describe('invalid route parameters', () => {
      it.each([
        {
          description: 'invalid MSA Id',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          badMsaId: 'invalid-msa-id',
          payload: generateBroadcast([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'invalid MSA Id',
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          badMsaId: 'invalid-msa-id',
          payload: generateReply([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'invalid MSA Id',
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          badMsaId: 'invalid-msa-id',
          payload: generateUpdate([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'invalid MSA Id',
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          badMsaId: 'invalid-msa-id',
          payload: generateProfile([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'negative MSA Id',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          badMsaId: '-1',
          payload: generateBroadcast([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'negative MSA Id',
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          badMsaId: '-1',
          payload: generateReply([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'negative MSA Id',
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          badMsaId: '-1',
          payload: generateUpdate([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'negative MSA Id',
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          badMsaId: '-1',
          payload: generateProfile([]),
          message: /msaId should be a valid positive number/,
        },

        {
          description: 'MSA Id too large',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          badMsaId: BigInt(2 ** 64).toString(),
          payload: generateBroadcast([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'MSA Id too large',
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          badMsaId: BigInt(2 ** 64).toString(),
          payload: generateReply([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'MSA Id too large',
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          badMsaId: BigInt(2 ** 64).toString(),
          payload: generateUpdate([]),
          message: /msaId should be a valid positive number/,
        },
        {
          description: 'MSA Id too large',
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          badMsaId: BigInt(2 ** 64).toString(),
          payload: generateProfile([]),
          message: /msaId should be a valid positive number/,
        },
      ])(
        'invalid route parameter ($description) should fail ($operation $endpoint)',
        async ({ endpoint, operation, badMsaId, payload, message }) => {
          await request(app.getHttpServer())
            [operation.toLowerCase()](endpoint.replace(':msaId', badMsaId))
            .send(payload)
            .expect(400)
            .expect((res) =>
              expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(message)])),
            );
        },
      );
    });

    describe('announcements with non-existent assets', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: generateBroadcast([missingAssetId]),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: generateReply([missingAssetId]),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: generateUpdate([missingAssetId]),
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: generateProfile([missingAssetId]),
        },
      ])(
        '$operation $endpoint should fail with non-existent asset reference',
        async ({ endpoint, operation, payload }) => {
          const resolvedEndpoint = endpoint.replace(':msaId', msaId);
          return request(app.getHttpServer())
            [operation.toLowerCase()](resolvedEndpoint)
            .send(payload)
            .expect(400)
            .expect((res) =>
              expect(res.body.message).toEqual(
                expect.arrayContaining([expect.stringMatching(/referenceId.*does not exist/)]),
              ),
            );
        },
      );
    });

    describe('announcements with invalid MIME type reference', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: generateBroadcast([badMimeTypeReferenceId]),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: generateReply([badMimeTypeReferenceId]),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: generateUpdate([badMimeTypeReferenceId]),
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: generateProfile([badMimeTypeReferenceId]),
        },
      ])(
        '$operation $endpoint with invalid MIME type reference should fail',
        async ({ endpoint, operation, payload }) => {
          const resolvedEndpoint = endpoint.replace(':msaId', msaId);
          return request(app.getHttpServer())
            [operation.toLowerCase()](resolvedEndpoint)
            .send(payload)
            .expect(400)
            .expect((res) =>
              expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/invalid MIME type/)])),
            );
        },
      );
    });

    describe('announcements with no asset references', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: generateBroadcast(),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: generateReply(),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: generateUpdate(),
        },
        {
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: validReaction,
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'DELETE',
          payload: validTombstone,
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: generateProfile(),
        },
      ])(
        '$operation $endpoint should work!',
        async ({ endpoint, operation, payload }) => {
          const resolvedEndpoint = endpoint.replace(':msaId', msaId);
          return request(app.getHttpServer())
            [operation.toLowerCase()](resolvedEndpoint)
            .send(payload)
            .expect(202)
            .expect((res) => expect(res.text).toContain('referenceId'));
        },
        15000,
      );
    });

    describe('announcements with valid uploaded asset', () => {
      let uploadedAssetIds: any[];

      beforeAll(async () => {
        const response = await request(app.getHttpServer())
          .post('/v2/asset/upload')
          .attach('files', randomFile30K, 'file1.jpg')
          .expect(202);
        uploadedAssetIds = response.body.assetIds;
        await sleep(1000);
      });

      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: () => generateBroadcast(uploadedAssetIds),
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: () => generateReply(uploadedAssetIds),
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: () => generateUpdate(uploadedAssetIds),
        },
        {
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: () => validReaction,
        },
        {
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: () => generateProfile(uploadedAssetIds),
        },
      ])(
        '$operation $endpoint with uploaded assets should work!',
        async ({ endpoint, operation, payload }) => {
          const resolvedEndpoint = endpoint.replace(':msaId', msaId);
          return request(app.getHttpServer())
            [operation.toLowerCase()](resolvedEndpoint)
            .send(payload())
            .expect(202)
            .expect((res) => expect(res.text).toContain('referenceId'));
        },
        15000,
      );
    });

    describe('announcements with empty body', () => {
      it.each([
        {
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
        },
        {
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
        },
        {
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
        },
        {
          endpoint: '/v1/content/:msaId',
          operation: 'DELETE',
        },
      ])('$operation $endpoint should fail with empty body', async ({ endpoint, operation }) => {
        await request(app.getHttpServer())
          [operation.toLowerCase()](endpoint.replace(':msaId', msaId))
          .send({})
          .expect(400);
      });
    });

    describe('announcements with invalid payloads', () => {
      it.each([
        {
          description: 'missing content',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            ...generateBroadcast(),
            content: undefined,
          },
          message: /content should not be empty/,
        },
        {
          description: 'empty content',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            ...generateBroadcast(),
            content: {
              published: new Date().toISOString(),
            },
          },
          message: /content\.content must be a string/,
        },
        {
          description: 'invalid content',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            ...generateBroadcast(),
            content: {
              ...validContentWithNoAssets,
              content: '',
            },
          },
          message: /content\.content must be longer/,
        },
        {
          description: 'missing published date',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              content: 'tests content',
            },
          },
          message: /content.published must be a valid ISO 8601 date string/,
        },
        {
          description: 'invalid published date',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              published: 'invalid-date',
            },
          },
          message: /content.published must be a valid ISO 8601 date string/,
        },
        {
          description: 'non-link asset with missing references',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              assets: [{ isLink: false }],
            },
          },
          message: /references must be an array/,
        },
        {
          description: 'non-link asset with empty references',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              assets: [{ isLink: false, references: [] }],
            },
          },
          message: /references should not be empty/,
        },
        {
          description: 'asset with non-unique references',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              assets: [
                {
                  isLink: false,
                  references: [{ referenceId: 'reference-id-1' }, { referenceId: 'reference-id-1' }],
                },
              ],
            },
          },
          message: /elements must be unique/,
        },
        {
          description: 'link asset without href',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              assets: [
                {
                  isLink: true,
                },
              ],
            },
          },
          message: /href must be longer than/,
        },
        {
          description: 'link asset invalid href protocol',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              assets: [
                {
                  isLink: true,
                  href: 'ftp://sgdjas8912yejc.com',
                },
              ],
            },
          },
          message: /href must be a URL address/,
        },
        {
          description: 'hashtag without name',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              tag: [
                {
                  type: TagTypeEnum.Hashtag,
                },
              ],
            },
          },
          message: /tag\..*\.name must be longer than or equal to 1 character/,
        },
        {
          description: 'mention without mentionedId',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              tag: [
                {
                  type: TagTypeEnum.Mention,
                },
              ],
            },
          },
          message: /Invalid DSNP User URI/,
        },
        {
          description: 'invalid tag type',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              tag: [
                {
                  type: 'invalid',
                },
              ],
            },
          },
          message: /type must be one of the following values:/,
        },
        {
          description: 'location with invalid units',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              ...validContentWithNoAssets,
              location: {
                ...validLocation,
                units: 'invalid',
              },
            },
          },
          message: /location\.units must be one of the following values:/,
        },
        {
          description: 'location with empty name',
          endpoint: '/v1/content/:msaId/broadcast',
          operation: 'POST',
          payload: {
            content: {
              content: 'tests content',
              published: new Date().toISOString(),
              location: {
                ...validLocation,
                name: '',
              },
            },
          },
          message: /location\.name must be longer than or equal to 1 characters/,
        },
        {
          description: 'missing inReplyTo',
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: {
            ...validBroadCastNoUploadedAssets,
          },
          message: /inReplyTo should be a valid DsnpContentURI/,
        },
        {
          description: 'invalid inReplyTo',
          endpoint: '/v1/content/:msaId/reply',
          operation: 'POST',
          payload: {
            ...validReplyNoUploadedAssets,
            inReplyTo: 'shgdjas72gsjajasa',
          },
          message: /inReplyTo should be a valid DsnpContentURI/,
        },
        {
          description: 'invalid emoji',
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: {
            ...validReaction,
            emoji: '2',
          },
          message: /emoji must match .* regular expression/,
        },
        {
          description: 'non-numeric apply strength',
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: {
            ...validReaction,
            apply: 'invalid',
          },
          message: /apply should be a number between 0 and 255/,
        },
        {
          description: 'negative apply strength',
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: {
            ...validReaction,
            apply: -1,
          },
          message: /apply should be a number between 0 and 255/,
        },
        {
          description: 'apply strength > 255',
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: {
            ...validReaction,
            apply: 256,
          },
          message: /apply should be a number between 0 and 255/,
        },
        {
          description: 'apply strength > 255',
          endpoint: '/v1/content/:msaId/reaction',
          operation: 'POST',
          payload: {
            ...validReaction,
            inReplyTo: 'shgdjas72gsjajasa',
          },
          message: /inReplyTo should be a valid DsnpContentURI/,
        },
        {
          description: 'invalid targetAnnouncementType',
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: {
            ...validUpdateNoUploadedAssets,
            targetAnnouncementType: 'invalid',
          },
          message: /targetAnnouncementType must be one of the following values/,
        },
        {
          description: 'invalid targetAnnouncementType',
          endpoint: '/v1/content/:msaId',
          operation: 'PUT',
          payload: {
            ...validUpdateNoUploadedAssets,
            targetContentHash: 'invalid',
          },
          message: /targetContentHash should be a valid DsnpContentHash/,
        },
        {
          description: 'invalid targetAnnouncementType',
          endpoint: '/v1/content/:msaId',
          operation: 'DELETE',
          payload: {
            ...validTombstone,
            targetAnnouncementType: 'invalid',
          },
          message: /targetAnnouncementType must be one of the following values/,
        },
        {
          description: 'invalid targetAnnouncementType',
          endpoint: '/v1/content/:msaId',
          operation: 'DELETE',
          payload: {
            ...validTombstone,
            targetContentHash: 'invalid',
          },
          message: /targetContentHash should be a valid DsnpContentHash/,
        },
        {
          description: 'invalid published date',
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: {
            profile: {
              ...validProfileNoUploadedAssets,
              published: 'invalid-date',
            },
          },
          message: /profile.published must be a valid ISO 8601 date string/,
        },
        {
          description: 'non-unique asset references',
          endpoint: '/v1/profile/:msaId',
          operation: 'PUT',
          payload: {
            profile: {
              ...validProfileNoUploadedAssets,
              icon: [
                {
                  referenceId: 'reference-id-1',
                },
                {
                  referenceId: 'reference-id-1',
                },
              ],
            },
          },
          message: /icon's elements must be unique/,
        },
      ])('$operation $endpoint should fail with $description', async ({ endpoint, operation, payload, message }) => {
        await request(app.getHttpServer())
          [operation.toLowerCase()](endpoint.replace(':msaId', msaId))
          .send(payload)
          .expect(400)
          .expect((res) => expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(message)])));
      });
    });

    describe('(PUT) /v1/profile/:userDsnpId', () => {
      it('non unique reference ids should fail', () =>
        request(app.getHttpServer())
          .put(`/v1/profile/123`)
          .send({
            profile: {
              icon: [
                {
                  referenceId: 'reference-id-1',
                },
                {
                  referenceId: 'reference-id-1',
                },
              ],
            },
          })
          .expect(400)
          .expect((res) => expect(res.text).toContain('elements must be unique')));
    });
  });

  describe('V2 Content', () => {
    let ipfsSchemaId: number;
    let onChainSchemaId: number;

    beforeAll(async () => {
      const onChainIntentName = 'e-e.on-chain';

      // TODO: Swap this in after Intents are deployed
      // Get any off-chain (IPFS) schema
      // const intents = await api.call.schemasRuntimeApi.getRegisteredEntitiesByName('dsnp.broadcast');
      // const intentWithSchemas = await api.call.schemasRuntimeApi.getIntentById(intents.unwrap()[0].id, true);
      // const schemaIds = intentWithSchemas.schema_ids.unwrap().to_array();
      // ipfsSchemaId = schemaIds.pop().toNumber();

      // Create on-chain Intent if one doesn't exist, since the chain genesis does not contain any
      // const onChainIntents = await api.call.schemasRuntimeApi.getRegisteredEntitiesByName(onChainIntentName);
      // if (onChainIntents.isSome && onChainIntents.unwrap().length > 0) {
      //   const onChainIntentWithSchemas = await api.call.schemasRuntimeApi.getIntentById(
      //     onChainIntents.unwrap()[0].id,
      //     true,
      //   );
      //   const schemaIds = onChainIntentWithSchemas.schema_ids.unwrap().to_array();
      //   onChainSchemaId = schemaIds.pop().toNumber();
      // } else {
      //   // This will only work against a local chain; if we want to test against testnet, would need to re-work using sudo
      //   const keys = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
      //   const intentId = await new Promise((resolve, reject) =>
      //     api.tx.schemas.createIntent(onChainIntentName, 'OnChain', []).signAndSend(keys, ({ status, events }) => {
      //       events.forEach(({ event: { data, method } }) => {
      //         if (method === 'IntentCreated') {
      //           resolve(data[0].toNumber());
      //         }
      //       });
      //     }),
      //   );
      //   onChainSchemaId = await new Promise((resolve, reject) =>
      //     api.tx.schemas.createSchemaV4(intentId, 'AvroBinary', {}).signAndSend(keys, ({ status, events }) => {
      //       events.forEach(({ event: { data, method } }) => {
      //         if (method === 'SchemaCreated') {
      //           resolve(data[0].toNumber());
      //         }
      //       });
      //     });
      // }

      // TODO: Remove in favor of above after Intents are deployed on Frequency
      // Get any off-chain (IPFS) schema ID
      let schemas = (await api.call.schemasRuntimeApi.getSchemaVersionsByName('dsnp.broadcast')).unwrap().toArray();
      ipfsSchemaId = schemas.pop().schemaId.toNumber();

      // Create an on-chain schema if one does not exist (since the chain genesis does not contain any)
      const schemaResponse = await api.call.schemasRuntimeApi.getSchemaVersionsByName(onChainIntentName);
      if (schemaResponse.isSome && schemaResponse.unwrap().length > 0) {
        schemas = schemaResponse.unwrap().toArray();
        onChainSchemaId = schemas.pop().schemaId.toNumber();
      } else {
        onChainSchemaId = await new Promise((resolve, reject) => {
          api.tx.schemas
            .createSchemaV3(JSON.stringify(AVRO_SCHEMA), 'AvroBinary', 'OnChain', [], onChainIntentName)
            .signAndSend(aliceKeys, ({ status, events }) => {
              console.log('STATUS: ', status);
              events.forEach(({ event }) => {
                console.log('EVENT: ', event.method);
                if (api.events.schemas.SchemaCreated.is(event)) {
                  resolve(event.data.schemaId.toNumber());
                }
              });
              // If in block but no event found, reject
              if (status.isInBlock) {
                reject(new Error('No SchemaCreated event found'));
              }
            });
        });
      }
    });

    describe('/v2/content/:msaId/on-chain', () => {
      const goodPayload = '0x' + Buffer.from('hello, world').toString('hex');
      const largePayload = () =>
        '0x' + Buffer.from('h'.repeat(api.consts.messages.messagesMaxPayloadSizeBytes.toNumber())).toString('hex');

      it.each([
        {
          description: 'non-numeric schemaId',
          schemaId: 'not a number',
          payload: goodPayload,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'non-integer schemaId string',
          schemaId: '1.2',
          payload: goodPayload,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'negative schemaId string',
          schemaId: '-1',
          payload: goodPayload,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'schemaId string with symbols',
          schemaId: '1,000',
          payload: goodPayload,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'negative schemaId',
          schemaId: -1,
          payload: goodPayload,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'schemaId too large',
          schemaId: 65536,
          payload: goodPayload,
          message: /schemaId should not exceed 65535/,
        },
        {
          description: 'non-hex payload',
          schemaId: () => onChainSchemaId,
          payload: 'not hex',
          message: /payload must be a hexadecimal number/,
          errorCount: 2,
        },
        {
          description: 'empty payload',
          schemaId: () => onChainSchemaId,
          payload: '',
          message: /payload should not be empty/,
          errorCount: 3,
        },
        {
          description: 'payload without 0x prefix',
          schemaId: () => onChainSchemaId,
          payload: goodPayload.slice(2),
          message: /payload bytes must include '0x' prefix/,
        },
      ])(
        '$description should fail',
        async ({
          schemaId,
          payload,
          message,
          errorCount,
        }: {
          description: string;
          schemaId: string | number | (() => number);
          payload: string;
          message: RegExp;
          errorCount?: number;
        }) => {
          return request(app.getHttpServer())
            .post(`/v2/content/${msaId}/on-chain`)
            .send({
              schemaId: typeof schemaId === 'function' ? schemaId() : schemaId,
              published: new Date().toISOString(),
              payload,
            })
            .expect(400)
            .expect((res) => expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(message)])))
            .expect((res) => expect(res.body.message).toHaveLength(errorCount || 1));
        },
      );

      it('payload too large should fail', async () => {
        return request(app.getHttpServer())
          .post(`/v2/content/${msaId}/on-chain`)
          .send({
            schemaId: onChainSchemaId,
            published: new Date().toISOString(),
            payload: largePayload(),
          })
          .expect(413);
      });

      it('schema with incorrect payload location should fail', async () => {
        return request(app.getHttpServer())
          .post(`/v2/content/${msaId}/on-chain`)
          .send({
            schemaId: ipfsSchemaId,
            published: new Date().toISOString(),
            payload: goodPayload,
          })
          .expect(422)
          .expect((res) => expect(res.body.message).toMatch(/Schema payload location invalid/));
      });

      it('request on behalf of un-delegated user should fail', async () => {
        return request(app.getHttpServer())
          .post(`/v2/content/${msaId}/on-chain`)
          .send({
            schemaId: onChainSchemaId,
            published: new Date().toISOString(),
            payload: goodPayload,
          })
          .expect(401)
          .expect((res) => expect(res.body.message).toMatch(/Provider not delegated/));
      });

      it('valid request should succeed', async () => {
        const providerMsaId = await api.query.msa.publicKeyToMsaId(aliceKeys.address);
        if (providerMsaId.isNone) {
          return false;
        }

        return request(app.getHttpServer())
          .post(`/v2/content/${process.env.PROVIDER_ID}/on-chain`)
          .send({
            schemaId: onChainSchemaId,
            published: new Date().toISOString(),
            payload: goodPayload,
          })
          .expect(202);
      });
    });

    describe('/v2/content/batchAnnouncement', () => {
      const cidV1 = 'bafybeierhgbz4zp2x2u67urqrgfnrnlukciupzenpqpipiz5nwtq7uxpx4';
      const cidV0 = 'QmY7Yh4UquoXHLPFo2XbhXkhBvFoPwmQUSa92pxnxjQuPU';

      it.each([
        {
          description: 'non-numeric schemaId',
          schemaId: 'not a number',
          cid: cidV1,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'non-integer schemaId string',
          schemaId: '1.2',
          cid: cidV1,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'negative schemaId string',
          schemaId: '-1',
          cid: cidV1,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'schemaId string with symbols',
          schemaId: '1,000',
          cid: cidV1,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'negative schemaId',
          schemaId: -1,
          cid: cidV1,
          message: /schemaId should be a positive integer/,
        },
        {
          description: 'schemaId too large',
          schemaId: 65536,
          cid: cidV1,
          message: /schemaId should not exceed 65535/,
        },
        {
          description: 'invalid cid',
          schemaId: () => ipfsSchemaId,
          cid: 'not a cid',
          message: /should be a valid CIDv1/,
        },
        {
          description: 'CIDv0',
          schemaId: () => ipfsSchemaId,
          cid: cidV0,
          message: /should be a valid CIDv1/,
        },
        // TODO: non-existent asset should fail
        // {
        //   description: 'non-existent asset',
        //   schemaId: () => ipfsSchemaId,
        //   cid: uploadedBatchRefId,
        //   message: /asset not found/,
        // },
        // TODO: unsupported MIME type for batches should be rejected
        // {
        //   description: 'asset with unsupported MIME type for batches',
        //   schemaId: () => ipfsSchemaId,
        //   cid: cidV1,
        //   message: /unsupported MIME type/,
        // },
      ])('$description should fail', async ({ schemaId, cid, message }) => {
        return request(app.getHttpServer())
          .post('/v2/content/batchAnnouncement')
          .send({ batchFiles: [{ schemaId: typeof schemaId === 'function' ? schemaId() : schemaId, cid }] })
          .expect(400)
          .expect((res) => expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(message)])))
          .expect((res) => expect(res.body.message).toHaveLength(1));
      });

      // TODO: enable test when we fix https://github.com/ProjectLibertyLabs/gateway/issues/1001
      it.skip('schemaId with on-chain payload location should fail', async () => {
        return request(app.getHttpServer())
          .post('/v2/content/batchAnnouncement')
          .send({ batchFiles: [{ schemaId: onChainSchemaId, cid: cidV1 }] })
          .expect(400)
          .expect((res) =>
            expect(res.body.message).toEqual(
              expect.arrayContaining([expect.stringMatching(/payload location invalid/)]),
            ),
          )
          .expect((res) => expect(res.body.message).toHaveLength(1));
      });

      it('good request should succeed', async () => {
        return request(app.getHttpServer())
          .post('/v2/content/batchAnnouncement')
          .send({ batchFiles: [{ schemaId: onChainSchemaId, cid: cidV1 }] })
          .expect(202)
          .expect((res) =>
            expect(res.body).toEqual(
              expect.arrayContaining([expect.objectContaining({ referenceId: expect.any(String) })]),
            ),
          );
      });
    });

    describe('/v2/content/:msaId/tombstones', () => {
      it.each([
        {
          description: 'empty targetContentHash',
          targetContentHash: base32.encode(Buffer.from('')),
          targetAnnouncementType: 'reply',
          message: /targetContentHash should be a valid DsnpContentHash/,
        },
        {
          description: 'invalid targetContentHash',
          targetContentHash: base32.encode(Buffer.from('some hash')),
          targetAnnouncementType: 'reply',
          message: /targetContentHash should be a valid DsnpContentHash/,
        },
        {
          description: 'invalid targetAnnouncementType',
          targetContentHash: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
          targetAnnouncementType: 'reaction',
          message: /targetAnnouncementType must be one of the following values/,
        },
      ])('$description should fail', ({ targetContentHash, targetAnnouncementType, message }) => {
        return request(app.getHttpServer())
          .post(`/v2/content/${msaId}/tombstones`)
          .send({ targetContentHash, targetAnnouncementType })
          .expect(400)
          .expect((res) => expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(message)])))
          .expect((res) => expect(res.body.message).toHaveLength(1));
      });

      it('valid request should succeed', async () => {
        return request(app.getHttpServer())
          .post(`/v2/content/${msaId}/tombstones`)
          .send({
            targetContentHash: 'bdyqdua4t4pxgy37mdmjyqv3dejp5betyqsznimpneyujsur23yubzna',
            targetAnnouncementType: 'reply',
          })
          .expect(202)
          .expect((res) => expect(res.body).toEqual(expect.objectContaining({ referenceId: expect.any(String) })));
      });
    });
  });
});
