// This is a very hack way to generate the swagger
// without needing any of the service dependencies.
// At some point we should find a better way, but
// there might not be one.

import '@frequency-chain/api-augment';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';

// Mock out required env vars before the module loads
const dummyUrl = 'http://127.0.0.1';
process.env.REDIS_URL = dummyUrl;
process.env.FREQUENCY_URL = dummyUrl;
process.env.IPFS_ENDPOINT = dummyUrl;
process.env.IPFS_GATEWAY_URL = dummyUrl;
process.env.CACHE_KEY_PREFIX = 'content-watcher:';

// eslint-disable-next-line
import { ApiModule } from './api.module';
// eslint-disable-next-line
import { apiFile, generateSwaggerDoc } from './swagger_config';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, {
    logger: process.env.DEBUG ? ['error', 'warn', 'log', 'verbose', 'debug'] : ['error'],
  });

  const document = await generateSwaggerDoc(app);
  // write swagger.json to disk
  fs.writeFileSync(
    apiFile,
    JSON.stringify(document, (_, v) => v, 2),
  );
  console.log(`OpenAPI written to ${apiFile}`);
  // Do NOT call await app.close() as that requires a connection to Redis
  process.exit(0);
}

bootstrap();
