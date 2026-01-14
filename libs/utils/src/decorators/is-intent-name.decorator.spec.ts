import { validate, useContainer } from 'class-validator';
import { IsIntentName, IsIntentNameConstraint } from './is-intent-name.decorator';
import { Test } from '@nestjs/testing';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';

const NAMES = [
  'dsnp.broadcast',
  'dsnp.dsnp-content-attribute-set',
  'dsnp.ext-content-attribute-set',
  'dsnp.private-connections',
  'dsnp.private-follows',
  'dsnp.profile-resources',
  'dsnp.profile',
  'dsnp.public-follows',
  'dsnp.public-key-assertion-method',
  'dsnp.public-key-key-agreement',
  'dsnp.reaction',
  'dsnp.reply',
  'dsnp.tombstone',
  'dsnp.update',
  'dsnp.user-attribute-set',
  'frequency.default-token-address',
];

class TestClass {
  @IsIntentName()
  intentName: string;
}

const validIntent = {
  name: 'valid.intent',
  intentId: 1,
};

describe('IsIntentName', () => {
  let blockchainService: BlockchainRpcQueryService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: BlockchainRpcQueryService,
          useValue: {
            getIntentNamesToIds: jest.fn(() => []),
          },
        },
        IsIntentNameConstraint,
      ],
    }).compile();

    // Important: point class-validator at Nest’s container for this test run
    useContainer(moduleRef, { fallbackOnErrors: true });

    blockchainService = moduleRef.get(BlockchainRpcQueryService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass for a single valid intent name', async () => {
    const testObj = new TestClass();
    testObj.intentName = NAMES[0];

    jest.spyOn(blockchainService, 'getIntentNamesToIds').mockResolvedValue([validIntent]);

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail for invalid intent name', async () => {
    const testObj = new TestClass();
    testObj.intentName = 'invalid.intent';

    jest.spyOn(blockchainService, 'getIntentNamesToIds').mockResolvedValue([]);

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsIntentName');
    expect(errors[0].constraints.IsIntentName).toBe(
      `intentName "${testObj.intentName}" must be a registered intent name.`,
    );
  });

  it.each([
    { value: '', description: 'empty string' },
    { value: null, description: 'null value' },
    { value: undefined, description: 'undefined' },
  ])('should fail for $description', async ({ value }) => {
    const testObj = new TestClass();
    testObj.intentName = value;

    const blockchainSpy = jest.spyOn(blockchainService, 'getIntentNamesToIds');

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(blockchainSpy).not.toHaveBeenCalled();
    expect(errors[0].constraints).toHaveProperty('IsIntentName');
  });
});
