import * as ipfsHash from 'ipfs-only-hash';
import { validate } from 'class-validator';
import { CID } from 'multiformats';
import { IsCidV1 } from './is-cidv1.decorator';
import { calculateIpfsCID } from '#utils/common/common.utils';

class TestClass {
  @IsCidV1()
  cid: string;
}

describe('IsCidV1', () => {
  it('should pass for valid CIDv1', async () => {
    const testObj = new TestClass();
    testObj.cid = await calculateIpfsCID(Buffer.from('test value'));

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail for invalid CID', async () => {
    const testObj = new TestClass();
    testObj.cid = 'Invalid hash value';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isCidV1');
    expect(errors[0].constraints.isCidV1).toBe('cid should be a valid CIDv1!');
  });

  it('should fail for empty string', async () => {
    const testObj = new TestClass();
    testObj.cid = '';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isCidV1');
  });

  it('should fail for null', async () => {
    const testObj = new TestClass();
    testObj.cid = null;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isCidV1');
  });

  it('should fail for undefined', async () => {
    const testObj = new TestClass();
    testObj.cid = undefined;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isCidV1');
  });

  it('should fail for CIDv0', async () => {
    const testObj = new TestClass();
    testObj.cid = CID.parse(await ipfsHash.of(Buffer.from('test value')))
      .toV0()
      .toString();

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('isCidV1');
  });
});
