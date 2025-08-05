import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getBasicPinoOptions, getCurrentLogLevel } from '#logger-lib';

import { Logger as PinoLogger } from 'nestjs-pino';
import { pino } from 'pino';
import { validateEnvironmentVariables } from '#utils/common/common.utils';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { generateSwaggerDoc, writeOpenApiFile } from '#openapi/openapi';
import workerConfig, { IGraphWorkerConfig } from './worker.config';
import { TimeoutInterceptor } from '#utils/interceptors/timeout.interceptor';
// use plain pino directly outside of the app.
const logger = pino(getBasicPinoOptions('graph-worker.main'));

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
  const app = await NestFactory.create<NestExpressApplication>(WorkerModule, {
    rawBody: true,
  });

  // Enable versioning
  app.enableVersioning({ type: VersioningType.URI });

  const pinoLogger = app.get(PinoLogger);
  app.useLogger(pinoLogger);
  validateEnvironmentVariables(pinoLogger);
  logger.info('Nest ApplicationContext for Graph Worker created.');

  const swaggerDoc = await generateSwaggerDoc(app, {
    title: 'Graph Worker Service',
    description: 'Graph Worker Service API',
    version: '2.0',
    extensions: new Map<string, any>([
      [
        'x-tagGroups',
        [
          { name: 'health', tags: ['health'] },
          { name: 'prometheus', tags: ['metrics'] },
        ],
      ],
    ]),
  });

  const args = process.argv.slice(2);
  if (args.find((v) => v === '--writeOpenApi')) {
    writeOpenApiFile(swaggerDoc, './openapi-specs/graph-worker.openapi.json');
    process.exit(0);
  }

  // Get event emitter & register a shutdown listener
  const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
  eventEmitter.on('shutdown', async () => {
    logger.warn('Received shutdown event');
    startShutdownTimer();
    await app.close();
  });

  const config = app.get<IGraphWorkerConfig>(workerConfig.KEY);
  try {
    app.enableShutdownHooks();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        enableDebugMessages: !!process.env.DEBUG,
      }),
    );
    app.useGlobalInterceptors(new TimeoutInterceptor(config.apiTimeoutMs));
    app.useBodyParser('json', { limit: config.apiBodyJsonLimit });
    logger.info(`Log level set to ${getCurrentLogLevel()}`);
    await app.listen(config.apiPort);
    logger.info(`Listening on port ${config.apiPort}`);
    logger.info('Exiting bootstrap');
  } catch (e) {
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
