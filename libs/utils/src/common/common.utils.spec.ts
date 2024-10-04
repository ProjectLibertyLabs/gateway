import { calculateDsnpMultiHash } from '#utils/common/common.utils';

describe('common utils Tests', () => {
  it('hashes sha256 correctly ABC and returns a multihash value', async () => {
    const mb = await calculateDsnpMultiHash(Buffer.from('abc'));
    expect(mb).toMatch('bcirbeif2pall7dybz7vecqka3zo24irdwabwdi4wc55jznaq75q7eaavvu');
  });
});
