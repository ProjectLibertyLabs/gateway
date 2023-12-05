import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class ApiService {
  private readonly logger: Logger;

  constructor(@InjectRedis() private redis: Redis) {
    this.logger = new Logger(this.constructor.name);
  }
}
