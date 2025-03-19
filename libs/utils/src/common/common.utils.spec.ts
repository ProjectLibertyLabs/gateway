import { calculateDsnpMultiHash, calculateIncrementalDsnpMultiHash } from '#utils/common/common.utils';
import { Readable } from 'stream';

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
});
