import { MessagePublisher } from '#content-publishing-worker/publisher/message.publisher';
import { BlockchainService } from '#blockchain/blockchain.service';
import { Test } from '@nestjs/testing';
import { NonceConflictError } from '#blockchain/types';
import { DelayedError } from 'bullmq';

describe('MessagePublisher', () => {
  let service: MessagePublisher;
  let blockchainService: BlockchainService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        {
          provide: BlockchainService,
          useValue: {
            payWithCapacity: jest.fn(),
            generateAddIpfsMessages: jest.fn(() => ({}) as any),
            generateAddOnchainMessage: jest.fn(() => ({}) as any),
          },
        },
        MessagePublisher,
      ],
    }).compile();

    service = moduleRef.get<MessagePublisher>(MessagePublisher);
    blockchainService = moduleRef.get<BlockchainService>(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processSingleBatch', () => {
    /**
     * This test arose from the fact that a missing 'await' caused the method under test
     * to throw the error directly from the blockchain service, instead of catching
     * it and potentially re-casting as a DelayedError.
     */
    it('should throw DelayedError on nonce conflict', async () => {
      // In order for this test to be valid, we need to make sure that we mock 'payWithCapacity'
      // call with a properly async operation
      jest.spyOn(blockchainService, 'payWithCapacity').mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            setTimeout(() => reject(new NonceConflictError()), 100);
          }),
      );

      await expect(service.processSingleBatch({} as any)).rejects.toThrowError(DelayedError);
    });
  });
});
