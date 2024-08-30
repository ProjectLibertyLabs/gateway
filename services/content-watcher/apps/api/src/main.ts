import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from './api.module';
import { initSwagger } from '@libs/common/config/swagger_config';
import { AppConfigService } from '@libs/common/config/config.service';

const logger = new Logger('main');

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
  const app = await NestFactory.create(ApiModule, {
    logger: process.env.DEBUG ? ['error', 'warn', 'log', 'verbose', 'debug'] : ['error', 'warn', 'log'],
  });
  const configService = app.get<AppConfigService>(AppConfigService);

  // Get event emitter & register a shutdown listener
  const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
  eventEmitter.on('shutdown', async () => {
    logger.warn('Received shutdown event');
    startShutdownTimer();
    await app.close();
  });

  try {
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe());
    await initSwagger(app, '/docs/swagger');
    logger.log(`Listening on port ${configService.apiPort}`);
    await app.listen(configService.apiPort);
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
