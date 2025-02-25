import { validate } from 'class-validator';
import { IsDsnpContentHash } from '#utils/decorators/is-dsnp-content-hash.decorator';
import { calculateDsnpMultiHash } from '#utils/common/common.utils';
import { identity } from 'multiformats/hashes/identity';
import { sha256 } from 'multiformats/hashes/sha2';
import { base32 } from 'multiformats/bases/base32';
import { base58btc } from 'multiformats/bases/base58';

class TestClass {
  @IsDsnpContentHash()
  contentHash: string;
}

describe('IsDsnpContentHash', () => {
  let testObj: TestClass;

  beforeEach(() => {
    testObj = new TestClass();
  });

  it('should pass for valid content hash', async () => {
    testObj.contentHash = await calculateDsnpMultiHash(Buffer.from('test value'));

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail for invalid dsnp content hash value', async () => {
    testObj.contentHash = 'Invalid hash value';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
    expect(errors[0].constraints.isDsnpContentHash).toBe('contentHash should be a valid DsnpContentHash!');
  });

  it('should fail for empty string', async () => {
    testObj.contentHash = '';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
  });

  it('should fail for null', async () => {
    testObj.contentHash = null;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
  });

  it('should fail for undefined', async () => {
    testObj.contentHash = undefined;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
  });

  it('should fail for non-base32 encoding', async () => {
    const hashed = await sha256.digest(Buffer.from('test value'));
    testObj.contentHash = base58btc.encode(hashed.bytes);

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
  });

  it('should fail for unsupported hash algorithm', async () => {
    const hashed = identity.digest(Buffer.from('test value'));
    testObj.contentHash = base32.encode(hashed.bytes);

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
  });
});
