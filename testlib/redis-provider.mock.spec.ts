import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';

const mockRedis = {
  exec: jest.fn(),
  get: jest.fn(),
  hget: jest.fn(),
  hdel: jest.fn(),
  hkeys: jest.fn(),
  hvals: jest.fn(),
  multi: jest.fn(),
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
