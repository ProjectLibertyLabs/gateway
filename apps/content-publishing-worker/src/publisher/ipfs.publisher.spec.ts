/* eslint-disable unused-imports/no-unused-vars */
// test file for ipfs publisher
import { describe, it, beforeEach } from '@jest/globals';
import { IPFSPublisher } from './ipfs.publisher';

describe('IPFSPublisher', () => {
  let ipfsPublisher: IPFSPublisher;

  beforeEach(async () => {});

  describe('publish', () => {
    it.skip('should return capacity used per epoch', async () => {
      const messages = [
        {
          schemaId: 1,
          data: {
            cid: 'QmRgJZmR6Z6yB5k9aLXjzJ6jG8L6tq4v4J9zQfDz7p3J9v',
            payloadLength: 100,
          },
        },
        {
          schemaId: 1,
          data: {
            cid: 'QmRgJZmR6Z6yB5k9aLXjzJ6jG8L6tq4v4J9zQfDz7p3J9v',
            payloadLength: 100,
          },
        },
      ];
    });
  });
});
