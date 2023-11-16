/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from '../src/api.module';
import { BlockchainService } from '../../../libs/common/src/blockchain/blockchain.service';

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
  });
  it('(Put) /api/registerWebhook', async () => {
    const webhookRegistrationDto = {
      url: 'http://localhost:3000/api/webhook',
      announcementTypes: ['Broadcast', 'Reaction', 'Tombstone', 'Reply', 'Update'],
    };
    const response = await request(app.getHttpServer())
      .put('/api/registerWebhook')
      .send(webhookRegistrationDto)
      .expect(200);
  });

  it('(GET) /api/health', () => request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 200 }));

  it('(Post) /api/resetScanner', async () => {
    const resetScannerDto = {
      blockNumber: 0,
    };
    const response = await request(app.getHttpServer())
      .post('/api/resetScanner')
      .send(resetScannerDto)
      .expect(201);
  });

  afterEach(async () => {
    try {
      await app.close();
    } catch (err) {
      console.error(err);
    }
  }, 15000);
});
