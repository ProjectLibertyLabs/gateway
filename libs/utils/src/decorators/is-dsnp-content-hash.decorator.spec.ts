import { validate } from 'class-validator';
import { IsDsnpContentHash } from '#utils/decorators/is-dsnp-content-hash.decorator';
import { calculateDsnpMultiHash } from '#utils/common/common.utils';

class TestClass {
  @IsDsnpContentHash()
  contentHash: string;
}

describe('IsDsnpContentHash', () => {
  it('should pass for valid content hash', async () => {
    const testObj = new TestClass();
    testObj.contentHash = await calculateDsnpMultiHash(Buffer.from('test value'));

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail for invalid dsnp content hash value', async () => {
    const testObj = new TestClass();
    testObj.contentHash = 'Invalid hash value';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
    expect(errors[0].constraints.isDsnpContentHash).toBe('contentHash should be a valid DsnpContentHash!');
  });

  it('should fail for empty string', async () => {
    const testObj = new TestClass();
    testObj.contentHash = '';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
  });

  it('should fail for null', async () => {
    const testObj = new TestClass();
    testObj.contentHash = null;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
  });

  it('should fail for undefined', async () => {
    const testObj = new TestClass();
    testObj.contentHash = undefined;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isDsnpContentHash');
  });
});
