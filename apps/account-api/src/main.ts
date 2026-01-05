import '@frequency-chain/api-augment';
import { NestFactory } from '@nestjs/core';
import { Logger as NestLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from './api.module';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import apiConfig, { IAccountApiConfig } from './api.config';
import { generateSwaggerDoc, initializeSwaggerUI, writeOpenApiFile } from '#openapi/openapi';
import { getCurrentLogLevel, getPinoHttpOptions } from '#logger-lib';

import { Logger, PinoLogger } from 'nestjs-pino';
import { setupLoggingOverrides, validateEnvironmentVariables } from '#utils/common/common.utils';

let logger: NestLogger;

/*
 * Shutdown timer will forcibly terminate the app if it doesn't complete
 * a graceful shutdown when requested. This is mostly because the @nestjs/bullmq
 * package doesn't seem to behave on exit under certain conditions (mainly if it
 * can't connect to Redis at startup)
 */
function startShutdownTimer() {
  setTimeout(() => {
    process.exit(1);
  }, 10_000);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiModule, {
    logger: new Logger(new PinoLogger(getPinoHttpOptions()), {}),
    rawBody: true,
  });

  app.useLogger(app.get(Logger));
  logger = new NestLogger('main');
  validateEnvironmentVariables(logger);
  setupLoggingOverrides();
  // Enable URL-based API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  const swaggerDoc = await generateSwaggerDoc(app, {
    title: 'Account Service',
    description: 'Account Service API',
    version: '2.0',
    extensions: new Map<string, any>([
      [
        'x-tagGroups',
        [
          { name: 'accounts', tags: ['v1/accounts', 'v2/accounts'] },
          { name: 'delegations', tags: ['v1/delegation', 'v2/delegations'] },
          { name: 'handles', tags: ['v1/handles'] },
          { name: 'ics', tags: ['v1/ics'] },
          { name: 'health', tags: ['health'] },
          { name: 'keys', tags: ['v1/keys'] },
          { name: 'prometheus', tags: ['metrics'] },
        ],
      ],
    ]),
  });

  const args = process.argv.slice(2);
  if (args.find((v) => v === '--writeOpenApi')) {
    writeOpenApiFile(swaggerDoc, './openapi-specs/account.openapi.json');
    process.exit(0);
  }

  // Get event emitter & register a shutdown listener
  const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
  eventEmitter.on('shutdown', async () => {
    logger.warn('Received shutdown event');
    startShutdownTimer();
    await app.close();
    logger.warn('app closed');
  });

  const config = app.get<IAccountApiConfig>(apiConfig.KEY);
  try {
    app.enableShutdownHooks();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });

    initializeSwaggerUI(app, swaggerDoc);
    logger.log(`Listening on port ${config.apiPort}`);
    logger.log(`Log level set to ${getCurrentLogLevel()}`);
    await app.listen(config.apiPort);
  } catch (e) {
    logger.log('****** MAIN CATCH ********');
    logger.error(e);
    startShutdownTimer();
    await app.close();
  }
}

bootstrap()
  .then(() => logger.log('bootstrap exited'))
  .catch((err) => {
    logger.error(err, 'UNHANDLED EXCEPTION IN BOOTSTRAP: ');
  });
