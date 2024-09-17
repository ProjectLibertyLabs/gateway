// This is a very hack way to generate the swagger
// without needing any of the service dependencies.
// At some point we should find a better way, but
// there might not be one.

import '@frequency-chain/api-augment';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';

// Ensure that the dev controller is included
process.env.ENVIRONMENT = 'dev';

// Mock out required env vars before the module loads
process.env.REDIS_URL = 'http://127.0.0.1';
process.env.FREQUENCY_URL = 'http://127.0.0.1';
process.env.FREQUENCY_HTTP_URL = 'http://127.0.0.1';
process.env.PROVIDER_ACCOUNT_SEED_PHRASE =
  'offer debate skin describe light badge fish turtle actual inject struggle border';
process.env.PROVIDER_ID = '0';
process.env.PROVIDER_BASE_URL = 'http://127.0.0.1';
process.env.CAPACITY_LIMIT = '{"type":"amount","value":"80"}';
process.env.IPFS_ENDPOINT = 'http://127.0.0.1';
process.env.IPFS_GATEWAY_URL = 'http://127.0.0.1';
process.env.FILE_UPLOAD_MAX_SIZE_IN_BYTES = '100';
process.env.FILE_UPLOAD_COUNT_LIMIT = '10';
process.env.ASSET_EXPIRATION_INTERVAL_SECONDS = '100';
process.env.BATCH_INTERVAL_SECONDS = '100';
process.env.BATCH_MAX_COUNT = '100';
process.env.ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS = '100';
process.env.CACHE_KEY_PREFIX = 'content-publishing:';

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
