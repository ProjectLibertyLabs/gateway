import { ResetScannerDto } from '#types/dtos/content-watcher/common.dto';
import request from 'supertest';

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

  it('(GET) /healthz', () =>
    request(WATCHER_URI)
      .get('/healthz')
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            status: 200,
            message: 'Service is healthy',
            timestamp: expect.any(Number),
            config: expect.objectContaining({
              apiBodyJsonLimit: expect.any(String),
              apiPort: expect.any(Number),
              apiTimeoutMs: expect.any(Number),
            }),
            redisStatus: expect.objectContaining({
              connected_clients: expect.any(Number),
              maxmemory: expect.any(Number),
              redis_version: expect.any(String),
              uptime_in_seconds: expect.any(Number),
              used_memory: expect.any(Number),
              queues: expect.arrayContaining([
                expect.objectContaining({
                  name: expect.any(String),
                  waiting: expect.any(Number),
                  active: expect.any(Number),
                  completed: expect.any(Number),
                  failed: expect.any(Number),
                  delayed: expect.any(Number),
                }),
              ]),
            }),
            blockchainStatus: expect.objectContaining({
              frequencyApiWsUrl: expect.any(String),
              latestBlockHeader: expect.objectContaining({
                blockHash: expect.any(String),
                number: expect.any(Number),
                parentHash: expect.any(String),
              }),
            }),
          }),
        );
      }));

  it('(GET) /livez', () =>
    request(WATCHER_URI)
      .get('/livez')
      .expect(200)
      .then((res) =>
        expect(res.body).toEqual(
          expect.objectContaining({ status: 200, message: 'Service is live', timestamp: expect.any(Number) }),
        ),
      ));

  it('(GET) /readyz', () =>
    request(WATCHER_URI)
      .get('/readyz')
      .expect(200)
      .then((res) =>
        expect(res.body).toEqual(
          expect.objectContaining({ status: 200, message: 'Service is ready', timestamp: expect.any(Number) }),
        ),
      ));

  it('(GET) /metrics', () => {
    request(WATCHER_URI).get('/metrics').expect(200);
  });

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
