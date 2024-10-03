import * as ipfsHash from 'ipfs-only-hash';
import { CID } from 'multiformats';
import { encode } from 'multihashes';
import { sha256 } from 'multiformats/hashes/sha2';
import { base32 } from 'multiformats/bases/base32';

export async function delayMS(ms): Promise<any> {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function calculateIpfsCID(buffer: Buffer): Promise<string> {
  const v0 = await ipfsHash.of(buffer);
  return CID.parse(v0).toV1().toString();
}

export const calculateDsnpMultiHash = async (fileBuffer: Buffer): Promise<string> => {
  // Hash with sha256
  // Encode with base32
  const hashed = await sha256.digest(fileBuffer);
  // add multihash prefix for sha256
  const multihash = encode(hashed.bytes, 'sha2-256');
  return base32.encode(multihash);
};
