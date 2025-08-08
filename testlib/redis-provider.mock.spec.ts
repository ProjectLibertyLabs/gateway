import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  defineCommand: jest.fn(),
};

export function mockRedisProvider(token = DEFAULT_REDIS_NAMESPACE) {
  return {
    provide: getRedisToken(token),
    useValue: mockRedis,
  };
}
