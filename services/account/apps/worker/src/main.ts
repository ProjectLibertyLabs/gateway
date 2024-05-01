import '@frequency-chain/api-augment';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { redisReady } from '#lib/utils/redis';
import { WorkerModule } from './worker.module';

const logger = new Logger('worker_main');

// bootstrap() does not have a main loop to keep the process alive.
// We create a promise that never resolves to keep the process alive and processing events.
const p = new Promise((resolve, reject) => {});

async function bootstrap() {
  // createApplicationContext() does not return when the redis connection is not available.
  // Starting the timeout here to ensure that the application does not hang indefinitely.
  const createTimeout = (message: string, duration: number): NodeJS.Timeout =>
    setTimeout(() => {
      logger.error(message);
      process.exit(1);
    }, duration);

  let redisConnectTimeout: NodeJS.Timeout | null = createTimeout('Redis connection timeout!', 30_000);

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: process.env.DEBUG ? ['error', 'warn', 'log', 'verbose', 'debug'] : ['error', 'warn', 'log'],
  });
  logger.log('Nest ApplicationContext created successfully.');

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

  // redisReady is set in redis.ts to capture the ready event from the Redis client
  // if it happens before execution reaches this point.
  if (redisReady) {
    logger.log('Redis connection already up.');
    clearTimeout(redisConnectTimeout);
    redisConnectTimeout = null;
  }

  eventEmitter.on('redis.ready', () => {
    logger.log('Redis Connected!');
    if (redisConnectTimeout !== null) {
      logger.log('Clearing reconnection timeout.');
      clearTimeout(redisConnectTimeout);
      redisConnectTimeout = null;
    }
  });

  // Note that if redis disconnects Bull Queues will log lots of Error: connect ECONNREFUSED that we cannot stop
  // This is due to https://github.com/taskforcesh/bullmq/issues/1073
  eventEmitter.on('redis.close', () => {
    // Shutdown after a disconnect of more than 30 seconds
    logger.error('Redis Disconnect Detected! Waiting 30 seconds for reconnection before shutdown.');
    if (redisConnectTimeout === null) {
      redisConnectTimeout = createTimeout('Redis reconnection timeout!', 30_000);
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
    // await here on unresolved promise, p, to process events
    await p;
  } catch (e) {
    await app.close();
    logger.error('****** MAIN CATCH ********', e);
    if (e instanceof Error) {
      logger.error(e.stack);
    }
  }
}

bootstrap().catch((err) => {
  logger.error('Unhandled exception in boostrap', err);
});
