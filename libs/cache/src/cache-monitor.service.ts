import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientNamespace } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { MILLISECONDS_PER_SECOND } from 'time-constants';

const REDIS_TIMEOUT_MS = 30_000;

@Injectable()
export class CacheMonitorService {
  private logger: Logger;

  private statusMap = new Map<ClientNamespace, boolean>();

  private timeout: NodeJS.Timeout | null;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger = new Logger(CacheMonitorService.name);
    this.startConnectionTimer();
  }

  public registerRedisClient(client: Redis, namespace: ClientNamespace = 'default') {
    client.on('error', (error) => this.handleRedisError(error, namespace));
    client.on('close', () => this.handleRedisClose(namespace));
    client.on('ready', () => this.handleRedisReady(namespace));
  }

  // eslint-disable-next-line class-methods-use-this
  public handleRedisError(_err: unknown, _namespace: ClientNamespace) {
    // this.logger.error(`REDIS ERROR [${namespace.toString()}]: `, err);
  }

  public handleRedisReady(namespace: ClientNamespace) {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (!this.statusMap.get(namespace)) {
      this.logger.log(`Redis [${namespace.toString()}] connected`);
    }
    this.statusMap.set(namespace, true);
    if (![...this.statusMap.values()].some((val) => !val)) {
      this.logger.log('All Redis connections up.');
    }
  }

  // // Note that if redis disconnects Bull Queues will log lots of Error: connect ECONNREFUSED that we cannot stop
  // // This is due to https://github.com/taskforcesh/bullmq/issues/1073
  public handleRedisClose(namespace: ClientNamespace) {
    if (this.statusMap.get(namespace)) {
      this.logger.error(`Redis [${namespace.toString()}] disconnected`);
    }
    this.statusMap.set(namespace, false);
    this.startConnectionTimer();
  }

  public startConnectionTimer() {
    if (!this.timeout) {
      this.logger.warn(`Waiting ${REDIS_TIMEOUT_MS / MILLISECONDS_PER_SECOND} seconds for Redis connections...`);
      this.timeout = setTimeout(() => this.handleRedisTimeout(), REDIS_TIMEOUT_MS);
    }
  }

  public handleRedisTimeout() {
    this.logger.error('Redis connection timeout');
    this.eventEmitter.emit('shutdown');
  }
}
