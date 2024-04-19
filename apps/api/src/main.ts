import '@frequency-chain/api-augment';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiModule } from './api.module';
import { initSwagger } from '../../../libs/common/src/config/swagger_config';
import { ConfigService } from '../../../libs/common/src/config/config.service';

const logger = new Logger('main');

// Monkey-patch BigInt so that JSON.stringify will work
// eslint-disable-next-line
BigInt.prototype['toJSON'] = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, {
    logger: process.env.DEBUG ? ['error', 'warn', 'log', 'verbose', 'debug'] : ['error', 'warn', 'log'],
  });

  // Get event emitter & register a shutdown listener
  const eventEmitter = app.get<EventEmitter2>(EventEmitter2);
  eventEmitter.on('shutdown', async () => {
    logger.warn('Received shutdown event');
    await app.close();
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

bootstrap();
