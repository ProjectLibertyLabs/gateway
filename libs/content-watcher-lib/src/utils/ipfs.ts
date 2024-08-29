import * as ipfsHash from 'ipfs-only-hash';
import { blake2b256 } from '@multiformats/blake2/blake2b';
import { create } from 'multiformats/hashes/digest';
import { CID } from 'multiformats';
import { base58btc } from 'multiformats/bases/base58';

export async function calculateIpfsCID(buffer: Buffer): Promise<string> {
  const v0 = await ipfsHash.of(buffer);
  return CID.parse(v0).toV1().toString();
}

export const calculateDsnpHash = async (fileBuffer: Buffer): Promise<string> => {
  const hash = await blake2b256.digest(fileBuffer);
  const digest = create(blake2b256.code, hash.bytes);
  return base58btc.encode(digest.bytes);
};
