import { calculateDsnpMultiHash } from '#utils/common/common.utils';

describe('common utils Tests', () => {
  it('hashes sha256 correctly ABC and returns a multihash value', async () => {
    const mb = await calculateDsnpMultiHash(Buffer.from('abc'));
    expect(mb).toMatch('bciqlu6awx6hqdt7kifaubxs5vyrchmadmgrzmf32ts2bb73b6iablli');
  });
});
