import { describe, it, beforeEach } from '@jest/globals';
import { BlockchainService } from './blockchain.service';

describe('BlockchainService', () => {
  let blockchainService: BlockchainService;

  beforeEach(async () => {});

  describe('createExtrinsicCall', () => {
    it('should return an extrinsic call', async () => {
      const pallet = 'messages';
      const extrinsic = 'addIpfsMessage';
      const schemaId = 1;
      const cid = 'QmRgJZmR6Z6yB5k9aLXjzJ6jG8L6tq4v4J9zQfDz7p3J9v';
      const payloadLength = 100;
    });
  });
});
