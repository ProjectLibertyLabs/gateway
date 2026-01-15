import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { validate } from 'class-validator';

class TestClass {
  @IsAccountIdOrAddress()
  accountIdAddress: string;
}

describe('IsAccountIdOrAddress', () => {
  it('passes for valid address types', async () => {
    const hexAddr: TestClass = new TestClass();
    hexAddr.accountIdAddress = '0x0123456701234567012345670123456701234567012345670123456701234567';
    const ss58Addr: TestClass = new TestClass();
    ss58Addr.accountIdAddress = '5CyxuMv1dG6TRz2wkHgDd7kFbbKNLbjsLU7U88z9y7PBq6sX';

    [hexAddr, ss58Addr].forEach(async (testObj) => {
      const errors = await validate(testObj);
      expect(errors.length).toEqual(0);
    });
  });

  it('fails for invalid address types', async () => {
    const badAddr: TestClass = new TestClass();
    badAddr.accountIdAddress = '0x5551212';
    const errors = await validate(badAddr);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints).toHaveProperty(IsAccountIdOrAddress.name);
    expect(errors[0].constraints.IsAccountIdOrAddress).toBe(
      'accountIdAddress should be a valid 32 bytes representing an account Id or address in Hex or SS58 format!',
    );
  });
});
