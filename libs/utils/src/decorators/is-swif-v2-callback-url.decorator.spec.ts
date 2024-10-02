import { validate } from 'class-validator';
import { IsSwifV2CallbackUrl } from './is-swif-v2-callback-url.decorator';

class TestClass {
  @IsSwifV2CallbackUrl()
  callbackUrl: string;
}

describe('IsSwifV2CallbackUrl', () => {
  it('should pass for valid URL without query parameters', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = 'https://example.com/callback';

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail for URL with query parameters', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = 'https://example.com/callback?param=value';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSwifV2CallbackUrl');
    expect(errors[0].constraints.IsSwifV2CallbackUrl).toBe('callbackUrl must be a valid URL without query parameters');
  });

  it('should fail for invalid URL', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = 'not-a-url';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSwifV2CallbackUrl');
  });

  it('should fail for empty string', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = '';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSwifV2CallbackUrl');
  });

  it('should fail for null', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = null;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSwifV2CallbackUrl');
  });

  it('should fail for undefined', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = undefined;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsSwifV2CallbackUrl');
  });

  it('should fail for URL with fragment', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = 'https://example.com/callback#fragment';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
  });

  it('should pass for URL with port', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = 'https://example.com:8080/callback';

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should pass for URL with username and password (although not sure why someone would do this)', async () => {
    const testObj = new TestClass();
    testObj.callbackUrl = 'https://user:pass@example.com/callback';

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });
});
