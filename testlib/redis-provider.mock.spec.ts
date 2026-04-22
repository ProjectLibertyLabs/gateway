import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';
import { jest } from '@jest/globals';

const mockRedis = {
  exec: jest.fn(),
  get: jest.fn(),
  hget: jest.fn(),
  hdel: jest.fn(),
  hkeys: jest.fn(),
  hvals: jest.fn(),
  multi: jest.fn().mockReturnThis(),
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

export function mockCacheManagerWith(cacheManager: any, hvals: string[], hgetVal: string) {
  jest.mocked(cacheManager.hvals).mockResolvedValue(hvals);
  jest.mocked(cacheManager.hget).mockResolvedValue(hgetVal);
  const mockPipeline = { hdel: jest.fn().mockReturnThis(), exec: jest.fn() };
  jest.spyOn(cacheManager as any, 'multi').mockReturnValue(mockPipeline);
}
