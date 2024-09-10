import { createHash } from 'crypto';

export * from './blockchain-constants';
export * from './queue.constants';
export * from './redis-keys.constants';

/**
 * Name of timeout event used for in memory scheduler
 */
export const CAPACITY_EPOCH_TIMEOUT_NAME = 'capacity-epoch-timeout';

export const calculateJobId = (jobWithoutId: any): string => {
  const stringVal = JSON.stringify(jobWithoutId);
  return createHash('sha1').update(stringVal).digest('base64url');
};
