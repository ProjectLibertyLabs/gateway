import request from 'supertest';
import { ResetScannerDto } from '../../../libs/common/src';

const WATCHER_URI = 'http://localhost:3000';

describe('Content Watcher E2E request verification!', () => {
  const webhookUrl = 'http://localhost:3005/api/webhook';
  it('(PUT) /api/registerWebhook', async () => {
    // register webhook '(Put) /api/registerWebhook'
    const webhookRegistrationDto = {
      url: webhookUrl,
      announcementTypes: ['Broadcast', 'Reaction', 'Tombstone', 'Reply', 'Update'],
    };
    await request(WATCHER_URI).put('/api/registerWebhook').send(webhookRegistrationDto).expect(200);
  }, 15000);

  it('(GET) /api/getRegisteredWebhooks', async () => {
    // Verify that the webhook was registered
    const response = await request(WATCHER_URI).get('/api/getRegisteredWebhooks').send().expect(200);

    expect(response.body).toHaveProperty('registeredWebhooks');
    expect(response.body.registeredWebhooks).toHaveLength(5);
    response.body.registeredWebhooks.forEach((registered) => {
      expect(registered.urls).toContain(webhookUrl);
    });
  }, 15000);

  it('(GET) /api/health', () => request(WATCHER_URI).get('/api/health').expect(200).expect({ status: 200 }));

  it('(Post) /api/resetScanner', async () => {
    const resetScannerDto: ResetScannerDto = {
      blockNumber: 1,
    };
    await request(WATCHER_URI).post('/api/resetScanner').send(resetScannerDto).expect(201);
  }, 15000);

  it('(Put) /api/search - search for content', async () => {
    const searchRequest = {
      startBlock: 1,
      endBlock: 100,
    };
    const response = await request(WATCHER_URI).put('/api/search').send(searchRequest).expect(200);
    expect(response.body).toHaveProperty('jobId');
    const { jobId } = response.body;
    expect(jobId).not.toBeNull();
  }, 15000);
});
