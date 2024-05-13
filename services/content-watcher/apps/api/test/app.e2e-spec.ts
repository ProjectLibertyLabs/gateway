import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import { BlockchainService } from '../../../libs/common/src/blockchain/blockchain.service';
import { ResetScannerDto } from '../../../libs/common/src';

describe('Content Watcher E2E request verification!', () => {
  let app: INestApplication;
  let module: TestingModule;
  // eslint-disable-next-line no-promise-executor-return
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();
    const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    eventEmitter.on('shutdown', async () => {
      await app.close();
    });
    app.useGlobalPipes(new ValidationPipe());
    app.enableShutdownHooks();
    await app.init();
    const blockchainService = app.get<BlockchainService>(BlockchainService);
    await blockchainService.isReady();

    // register webhook '(Put) /api/registerWebhook'
    const webhookRegistrationDto = {
      url: 'http://localhost:3005/api/webhook',
      announcementTypes: ['Broadcast', 'Reaction', 'Tombstone', 'Reply', 'Update'],
    };
    const response = await request(app.getHttpServer()).put('/api/registerWebhook').send(webhookRegistrationDto).expect(200);
  });

  it('(GET) /api/health', () => request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 200 }));

  it('(Post) /api/resetScanner', async () => {
    const resetScannerDto: ResetScannerDto = {
      blockNumber: '0',
    };
    const response = await request(app.getHttpServer()).post('/api/resetScanner').send(resetScannerDto).expect(201);
  }, 15000);

  it('(Put) /api/search - search for content', async () => {
    const searchRequest = {
      startBlock: '0',
      endBlock: '100',
    };
    const response = await request(app.getHttpServer()).put('/api/search').send(searchRequest).expect(200);
    expect(response.body).toHaveProperty('jobId');
    const { jobId } = response.body;
    expect(jobId).not.toBeNull();
  }, 15000);

  afterEach(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  }, 15000);
});
