import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from './api.module';
import apiConfig, { IContentWatcherApiConfig } from './api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { generateSwaggerDoc, initializeSwaggerUI, writeOpenApiFile } from '#openapi/openapi';

const logger = new Logger('main');

// Monkey-patch BigInt so that JSON.stringify will work
 
BigInt.prototype['toJSON'] = function () {
  return this.toString();
};

/*
 * Shutdown timer will forcibly terminate the app if it doesn't complete
 * a graceful shutdown when requested. This is mostly because the @nestjs/bullmq
 * package doesn't seem to behave on exit under certain conditions (mainly if it
 * can't connect to Redis at startup)
 */
function startShutdownTimer() {
  setTimeout(() => process.exit(1), 10_000);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiModule, {
    logger: process.env.DEBUG ? ['error', 'warn', 'log', 'verbose', 'debug'] : ['error', 'warn', 'log'],
    rawBody: true,
  });

  // Enable URL-based API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  const swaggerDoc = await generateSwaggerDoc(app, {
    title: 'Content Watcher Service API',
    description: 'Content Watcher Service API',
    version: '1.0',
    extensions: new Map<string, any>([
      [
        'x-tagGroups',
        [
          { name: 'health', tags: ['health'] },
          { name: 'scanner', tags: ['v1/scanner'] },
          { name: 'search', tags: ['v1/search'] },
          { name: 'webhooks', tags: ['v1/webhooks'] },
        ],
      ],
    ]),
  });

  const args = process.argv.slice(2);
  if (args.find((v) => v === '--writeOpenApi')) {
    writeOpenApiFile(swaggerDoc, './openapi-specs/content-watcher.openapi.json');
    process.exit(0);
  }

  const config = app.get<IContentWatcherApiConfig>(apiConfig.KEY);

  // Get event emitter & register a shutdown listener
  const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
  eventEmitter.on('shutdown', async () => {
    logger.warn('Received shutdown event');
    startShutdownTimer();
    await app.close();
  });

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
    await app.listen(config.apiPort);
  } catch (e) {
    await app.close();
    logger.log('****** MAIN CATCH ********');
    logger.error(e);
    if (e instanceof Error) {
      logger.error(e.stack);
    }
    startShutdownTimer();
    await app.close();
  }
}

bootstrap()
  .then(() => logger.log('bootstrap exited'))
  .catch((err) => logger.error('Unhandled exception in bootstrap', err, err?.stack));
