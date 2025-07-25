import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from './api.module';
import apiConfig, { IGraphApiConfig } from './api.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { generateSwaggerDoc, initializeSwaggerUI, writeOpenApiFile } from '#openapi/openapi';
import { getBasicPinoOptions, getCurrentLogLevel } from '#logger-lib';

import { Logger as PinoLogger } from 'nestjs-pino';
import { pino } from 'pino';
import { validateEnvironmentVariables } from '#utils/common/common.utils';
// use plain pino directly outside of the app.
const logger = pino(getBasicPinoOptions('account-api.main'));

// Monkey-patch BigInt so that JSON.stringify will work
// eslint-disable-next-line
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
    rawBody: true,
  });
  const pinoLogger = app.get(PinoLogger);
  app.useLogger(pinoLogger);
  validateEnvironmentVariables(pinoLogger);

  // Enable URL-based API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  const swaggerDoc = await generateSwaggerDoc(app, {
    title: 'Graph Service',
    description: 'Graph Service API',
    version: '1.0',
    extensions: new Map<string, any>([
      [
        'x-tagGroups',
        [
          { name: 'graphs', tags: ['v1/graphs'] },
          { name: 'health', tags: ['health'] },
          { name: 'webhooks', tags: ['v1/webhooks'] },
        ],
      ],
    ]),
  });

  const args = process.argv.slice(2);
  if (args.find((v) => v === '--writeOpenApi')) {
    writeOpenApiFile(swaggerDoc, './openapi-specs/graph.openapi.json');
    process.exit(0);
  }

  const apiConf = app.get<IGraphApiConfig>(apiConfig.KEY);

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

    app.useGlobalInterceptors(new TimeoutInterceptor(apiConf.apiTimeoutMs));
    app.useBodyParser('json', { limit: apiConf.apiBodyJsonLimit });

    initializeSwaggerUI(app, swaggerDoc);
    logger.info(`Listening on port ${apiConf.apiPort}`);
    logger.info(`Log level set to ${getCurrentLogLevel()}`);
    await app.listen(apiConf.apiPort);
  } catch (e) {
    await app.close();
    logger.info('****** MAIN CATCH ********');
    logger.error(e);
    if (e instanceof Error) {
      logger.error(e.stack);
    }
    startShutdownTimer();
    await app.close();
  }
}

bootstrap()
  .then(() => logger.info('bootstrap exited'))
  .catch((err) => logger.error(err, 'UNHANDLED EXCEPTION IN BOOTSTRAP: '));
