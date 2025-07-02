import { calculateDsnpMultiHash, calculateIncrementalDsnpMultiHash } from '#utils/common/common.utils';
import { Readable } from 'stream';
import {
  getKeypairTypeForProviderKey,
  getKeypairTypeFromRequestAddress,
  getUnifiedAddressFromAddress,
} from '#utils/common/signature.util';
import { createKeys } from '#testlib/keys.spec';
import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { getSS58AccountFromEthereumAccount } from '@frequency-chain/ethereum-utils';
import { u8aToHex } from '@polkadot/util';

const testBuffer = Buffer.from('abc');

describe('common utils Tests', () => {
  beforeAll(async () => {
    await cryptoWaitReady();
  });
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

  it('getKeypairTypeFromRequestAddress', async () => {
    const ethAddr20 = '0x1234567890123456789012345678901234567890';
    const unifiedEthAddr = ethAddr20 + 'ee'.repeat(12);
    const { keyringPair } = createKeys();
    const keyring = new Keyring();

    const testCases = [
      { input: ethAddr20, expected: 'ethereum' },
      { input: unifiedEthAddr, expected: 'ethereum' },
      { input: getSS58AccountFromEthereumAccount(ethAddr20), expected: 'ethereum' },
      { input: getSS58AccountFromEthereumAccount(unifiedEthAddr), expected: 'ethereum' },
      { input: keyringPair.address, expected: 'sr25519' },
      { input: u8aToHex(keyring.decodeAddress(keyringPair.address)), expected: 'sr25519' },
    ];
    testCases.forEach((testCase) =>
      expect(getKeypairTypeFromRequestAddress(testCase.input)).toEqual(testCase.expected),
    );
  });

  it('getUnifiedAddressFromAddress works', async () => {
    const ethAddr = '0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac';
    const ss58UnifiedEthAddr = '5HYRCKHYJN9z5xUtfFkyMj4JUhsAwWyvuU8vKB1FcnYTf9ZQ';
    expect(getUnifiedAddressFromAddress(ethAddr)).toEqual(ss58UnifiedEthAddr);

    const unifiedAthAddr = ethAddr + 'ee'.repeat(12);
    expect(getUnifiedAddressFromAddress(unifiedAthAddr)).toEqual(unifiedAthAddr);
    expect(getUnifiedAddressFromAddress(ss58UnifiedEthAddr)).toEqual(ss58UnifiedEthAddr);
  });
});
