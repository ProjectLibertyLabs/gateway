import '@frequency-chain/api-augment';
import { NestFactory } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KeepAliveStrategy } from '#utils/common/keepalive-strategy';
import { WorkerModule } from './worker.module';
import { getBasicPinoOptions, getCurrentLogLevel } from '#logger-lib';

import { Logger as PinoLogger } from 'nestjs-pino';
import { pino } from 'pino';
// use plain pino directly outside of the app.
const logger = pino(getBasicPinoOptions('account-worker.main'));

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
  process.on('uncaughtException', (error) => {
    console.error('****** UNCAUGHT EXCEPTION ******', error);
    process.exit(1);
  });

  const app = await NestFactory.createMicroservice(WorkerModule, {
    strategy: new KeepAliveStrategy(),
  });
  app.useLogger(app.get(PinoLogger));
  logger.info('Nest ApplicationContext created successfully.');

  // Get event emitter & register a shutdown listener
  const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
  eventEmitter.on('shutdown', async () => {
    logger.warn('Received shutdown event');
    startShutdownTimer();
    await app.close();
  });

  try {
    app.enableShutdownHooks();
    logger.info(`Log level set to ${getCurrentLogLevel()}`);
    await app.listen();
  } catch (e) {
    logger.error('****** MAIN CATCH ********', e);
    if (e instanceof Error) {
      logger.error(e.stack);
    }
    startShutdownTimer();
    await app.close();
  }
}

bootstrap()
  .then(() => logger.info('bootstrap exited'))
  .catch((err) => logger.error('Unhandled exception in bootstrap', err, err?.stack));
