import '@frequency-chain/api-augment';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '#lib/config/config.service';
import { initSwagger } from '#lib/config/swagger_config';
import { ApiModule } from './api.module';

const logger = new Logger('main');

// Monkey-patch BigInt so that JSON.stringify will work
// eslint-disable-next-line
BigInt.prototype['toJSON'] = function () {
  return this.toString();
};

async function bootstrap() {
  // Starting the disconnect timeout here to ensure that the application does not hang indefinitely.
  let redisConnectTimeout: NodeJS.Timeout | null = setTimeout(() => {
    logger.error('Redis connection timeout!');
    process.exit(1);
  }, 30_000);

  const app = await NestFactory.create(ApiModule, {
    logger: process.env.DEBUG ? ['error', 'warn', 'log', 'verbose', 'debug'] : ['error', 'warn', 'log'],
  });
  logger.debug('DEBUG log is enabled');
  logger.verbose('VERBOSE log is enabled');

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

  eventEmitter.on('redis.ready', () => {
    logger.log('Redis Connected!');
    if (redisConnectTimeout !== null) {
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
    app.useGlobalPipes(new ValidationPipe());

    const configService = app.get<ConfigService>(ConfigService);
    await initSwagger(app, '/api/docs/swagger');
    logger.log(`Listening on port ${configService.apiPort}`);
    await app.listen(configService.apiPort);
  } catch (e) {
    await app.close();
    logger.log('****** MAIN CATCH ********');
    logger.error(e);
    if (e instanceof Error) {
      logger.error(e.stack);
    }
  }
}

bootstrap().catch((err) => {
  logger.error('Unhandled exception in boostrap', err);
});
