// This is a very hack way to generate the swagger
// without needing any of the service dependencies.
// At some point we should find a better way, but
// there might not be one.

import '@frequency-chain/api-augment';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';

// Mock out required env vars before the module loads
process.env.REDIS_URL = 'http://127.0.0.1';
process.env.FREQUENCY_URL = 'http://127.0.0.1';

// eslint-disable-next-line
import { ApiModule } from './api.module';
// eslint-disable-next-line
import { generateSwaggerDoc } from '../../../libs/common/src/config/swagger_config';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, {
    logger: process.env.DEBUG ? ['error', 'warn', 'log', 'verbose', 'debug'] : ['error'],
  });

  const document = await generateSwaggerDoc(app);
  // write swagger.json to disk
  fs.writeFileSync(
    './swagger.json',
    JSON.stringify(document, (_, v) => v, 2),
  );
  console.log('OpenAPI written to ./swagger.json');
  // Do NOT call await app.close() as that requires a connection to Redis
  process.exit(0);
}

bootstrap();
