import { calculateDsnpMultiHash, calculateIncrementalDsnpMultiHash } from '#utils/common/common.utils';
import { Readable } from 'stream';
import { getKeypairTypeForProviderKey } from '#utils/common/signature.util';

const testBuffer = Buffer.from('abc');

describe('common utils Tests', () => {
  it('hashes sha256 correctly ABC and returns a multihash value', async () => {
    const mb = await calculateDsnpMultiHash(testBuffer);
    expect(mb).toMatch('bciqlu6awx6hqdt7kifaubxs5vyrchmadmgrzmf32ts2bb73b6iablli');
  });

  it('hashes sha256 correctly "abc" and returns a multihash value', async () => {
    const stream = Readable.from(testBuffer);
    const bufHash = await calculateDsnpMultiHash(testBuffer);
    const mb = await calculateIncrementalDsnpMultiHash(stream);
    expect(mb).toMatch(bufHash);
  });

  it('getKeyPairTypeForKeyUriOrPrivateKey', () => {
    const testCases = [
      { input: '//Alice', expected: 'sr25519' },
      { input: 'purpose dismiss lens add kid churn example force swear cherry clock brother', expected: 'sr25519' },
      { input: '0xcb5bdff4e20f8a8b11d35628b6a48500967e88e5cdf219cf2136342347716725', expected: 'ethereum' },
    ];

    testCases.forEach((testCase) => expect(getKeypairTypeForProviderKey(testCase.input)).toEqual(testCase.expected));

    expect(() => getKeypairTypeForProviderKey('deadbeef')).toThrowError('unsupported seed or uri or key type');
  });
});
