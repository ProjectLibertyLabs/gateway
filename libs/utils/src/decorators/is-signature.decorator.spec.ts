 
import { validate } from 'class-validator';
import { IsSignature } from '#utils/decorators/is-signature.decorator';

class TestClass1 {
  @IsSignature()
  proof: string;
}

class TestClass2 {
  @IsSignature({ requiresSignatureType: true })
  proof: string;
}

describe('IsSignature', () => {
  it('should pass for valid regular signature', async () => {
    const testObj = new TestClass1();
    testObj.proof =
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85';

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should pass for valid signature with type', async () => {
    const testObj = new TestClass2();
    testObj.proof =
      '0x01065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85';

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail for invalid signature value', async () => {
    const testObj = new TestClass1();
    testObj.proof = 'Invalid signature';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSignature');
    expect(errors[0].constraints.IsSignature).toBe(
      'proof should be a valid 64 bytes Sr25519 signature value in hex! Or a valid 65-66 bytes MultiSignature value in hex!',
    );
  });

  it('should fail for valid signature without type when type is required', async () => {
    const testObj = new TestClass2();
    testObj.proof =
      '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSignature');
    expect(errors[0].constraints.IsSignature).toBe('proof should be a valid 65-66 bytes MultiSignature value in hex!');
  });

  it('should fail for empty string', async () => {
    const testObj = new TestClass1();
    testObj.proof = '';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSignature');
  });

  it('should fail for null', async () => {
    const testObj = new TestClass1();
    testObj.proof = null;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSignature');
  });

  it('should fail for undefined', async () => {
    const testObj = new TestClass1();
    testObj.proof = undefined;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSignature');
  });
});
