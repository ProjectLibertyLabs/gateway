import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { ApiModule } from '../src/api.module';
import { HealthCheckModule } from '#health-check/health-check.module';
import {
  validOnChainContent,
  validReaction,
  assetMetaDataInvalidMimeType,
  validTombstone,
  generateBroadcast,
  generateReply,
  generateUpdate,
  generateProfile,
  AVRO_SCHEMA,
} from './mockRequestData';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import Redis from 'ioredis';
import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';
import { Logger, PinoLogger } from 'nestjs-pino';
import { getPinoHttpOptions } from '#logger-lib';
import { ContentPublisherRedisConstants } from '#types/constants';
import getAssetMetadataKey = ContentPublisherRedisConstants.getAssetMetadataKey;
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { ApiPromise } from '@polkadot/api';
import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { KeyringPair } from '@polkadot/keyring/types';
import { base32 } from 'multiformats/bases/base32';
import { hexToU8a } from '@polkadot/util';

let aliceKeys: KeyringPair;

const randomString = (length: number, _unused) =>
  randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

validOnChainContent.payload = randomString(1024, null);

const sleep = (ms: number) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

const msaId = '123';

describe('Content Publishing E2E Endpoint Verification', () => {
  let app: NestExpressApplication;
  let module: TestingModule;
  let redis: Redis;
  let blockchainService: BlockchainRpcQueryService;
  let api: ApiPromise;

  const randomFile30K = Buffer.from('h'.repeat(30 * 1024)); // 30KB

  beforeAll(async () => {
    await cryptoWaitReady();
    aliceKeys = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');

    module = await Test.createTestingModule({
      imports: [ApiModule, HealthCheckModule],
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

    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    await app.init();

    redis = app.get<Redis>(getRedisToken(DEFAULT_REDIS_NAMESPACE));
    blockchainService = app.get(BlockchainRpcQueryService);
    api = (await blockchainService.getApi()) as ApiPromise;
  });

  describe('/v1/asset/upload', () => {
    it('upload request with no files should fail', async () => {
      await request(app.getHttpServer())
        .put('/v1/asset/upload')
        .expect(422)
        .expect((res) => expect(res.body.message).toBe('File is required'));
    });

    it('too many files in a single upload request should fail', async () => {
      let req = request(app.getHttpServer()).put('/v1/asset/upload');
      for (const i of Array(11).keys()) {
        req = req.attach('files', randomFile30K, `file${i}.jpg`);
      }
      await req.expect(400).expect((res) => expect(res.body.message).toBe('Too many files'));
    });

    it('MIME type not in whitelist should fail', async () => {
      await request(app.getHttpServer())
        .put('/v1/asset/upload')
        .attach('files', randomFile30K, 'file.bmp')
        .expect(422)
        .expect((res) => expect(res.body.message).toMatch(/Validation failed.*current file type is.*expected type is/));
    });

    it('valid request with legal assets should work!', async () => {
      await request(app.getHttpServer())
        .put(`/v1/asset/upload`)
        .attach('files', randomFile30K, 'file1.jpg')
        .expect(202)
        .expect((res) => expect(res.body.assetIds.length).toBe(1));
    });
  });

  describe('/v2/asset/upload', () => {
    it('upload request with no files should fail', async () => {
      await request(app.getHttpServer()).post('/v2/asset/upload').expect(500);
    });

    it('endpoint should only accept max number of allowed files', async () => {
      let req = request(app.getHttpServer()).post('/v2/asset/upload');
      for (const i of Array(11).keys()) {
        req = req.attach('files', randomFile30K, `file${i}.jpg`);
      }
      await req
        .expect(202)
        .expect((res) => expect(res.body.files.length).toBe(11))
        .expect((res) => expect(res.body.files[10].error).toMatch(/Max file/));
    });

    it('MIME type not in whitelist should fail', async () => {
      await request(app.getHttpServer())
        .post('/v2/asset/upload')
        .attach('files', randomFile30K, 'file.bmp')
        .expect(202)
        .expect((res) => expect(res.body.files[0].error).toMatch(/Unsupported file type/));
    });

    it('valid request with legal assets should work!', async () => {
      await request(app.getHttpServer())
        .post(`/v2/asset/upload`)
        .attach('files', randomFile30K, 'file1.jpg')
        .expect(202)
        .expect((res) => expect(res.body.files[0].cid).toBeTruthy());
    });
  });

  describe('V1 Content and Profile', () => {
    const missingAssetId = '9876543210';
    const badMimeTypeReferenceId = '0123456789';

    beforeAll(async () => {
      // Modify the asset cache with a disallowed MIME type asset
      await redis.set(getAssetMetadataKey(badMimeTypeReferenceId), JSON.stringify(assetMetaDataInvalidMimeType));
    });

    describe('announcements with missing assets', () => {
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
      ])('$operation $endpoint should fail with missing asset reference', async ({ endpoint, operation, payload }) => {
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
      });
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

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .put('/v1/asset/upload')
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
            payload: `0x${goodPayload}`,
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

  describe('V3 Content', () => {
    it.todo('/v2/content/batchAnnouncement');
  });
});
