import { validate } from 'class-validator';
import { IsCredentialType } from './is-credential-type.decorator';
import { KnownCredentialTypes } from '@projectlibertylabs/siwf';

class TestClass {
  @IsCredentialType()
  credentialType: string;
}

describe('IsCredentialType', () => {
  it('should pass for valid credential types', async () => {
    const testObj = new TestClass();
    testObj.credentialType = 'VerifiedPhoneNumberCredential';

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail for invalid credential types', async () => {
    const testObj = new TestClass();
    testObj.credentialType = 'InvalidCredentialType';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsCredentialType');
    expect(errors[0].constraints.IsCredentialType).toBe(
      'credentialType has unknown credential type: "InvalidCredentialType"',
    );
  });

  it('should fail for empty string', async () => {
    const testObj = new TestClass();
    testObj.credentialType = '';

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsCredentialType');
  });

  it('should fail for null', async () => {
    const testObj = new TestClass();
    testObj.credentialType = null;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsCredentialType');
  });

  it('should fail for undefined', async () => {
    const testObj = new TestClass();
    testObj.credentialType = undefined;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty('IsCredentialType');
  });

  it('should pass for all known credential types', async () => {
    await Promise.all(
      [...KnownCredentialTypes.values()].map(async (credentialType) => {
        const testObj = new TestClass();
        testObj.credentialType = credentialType;

        const errors = await validate(testObj);
        expect(errors.length).toBe(0);
      }),
    );
  });
});
