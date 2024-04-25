import '@frequency-chain/api-augment';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkerModule } from './worker.module';

const logger = new Logger('worker_main');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: process.env.DEBUG ? ['error', 'warn', 'log', 'verbose', 'debug'] : ['error', 'warn', 'log'],
  });

  process.on('uncaughtException', (error) => {
    console.error('****** UNCAUGHT EXCEPTION ******', error);
    process.exit(1);
  });

  // Get event emitter & register a shutdown listener
  const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
  eventEmitter.on('shutdown', async () => {
    logger.warn('Received shutdown event');
    await app.close();
  });

  // eslint-disable-next-line no-undef
  let redisConnectTimeout: NodeJS.Timeout | null = setTimeout(() => {
    logger.error('Redis connection timeout!');
    process.exit(1);
  }, 30_000);
  eventEmitter.on('redis.ready', () => {
    if (redisConnectTimeout !== null) {
      logger.log('Redis Connected!');
      clearTimeout(redisConnectTimeout);
      redisConnectTimeout = null;
    }
  });

  // Note that if redis disconnects Bull Queues will log lots of Error: connect ECONNREFUSED that we cannot stop
  // This is due to https://github.com/taskforcesh/bullmq/issues/1073
  eventEmitter.on('redis.close', () => {
    // Shutdown after a disconnect of more than 30 seconds
    if (redisConnectTimeout === null) {
      logger.error('Redis Disconnect Detected! Waiting 30 seconds for reconnection before shutdown.');
      redisConnectTimeout = setTimeout(() => {
        logger.error('Redis reconnection timeout!');
        process.exit(1);
      }, 30_000);
    }
  });

  eventEmitter.on('redis.error', (err: Error) => {
    // Only log errors if we are not in a connection situation
    if (redisConnectTimeout === null) {
      logger.error('Redis Error!', err);
    }
  });

  try {
    app.enableShutdownHooks();
  } catch (e) {
    await app.close();
    logger.error('****** MAIN CATCH ********', e);
    if (e instanceof Error) {
      logger.error(e.stack);
    }
  }
}
bootstrap();
