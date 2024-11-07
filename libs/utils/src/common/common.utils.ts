import * as ipfsHash from 'ipfs-only-hash';
import { CID } from 'multiformats';
import { sha256 } from 'multiformats/hashes/sha2';
import { base32 } from 'multiformats/bases/base32';

export async function delayMS(ms): Promise<any> {
   
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function calculateIpfsCID(buffer: Buffer): Promise<string> {
  const v0 = await ipfsHash.of(buffer);
  return CID.parse(v0).toV1().toString();
}

export const calculateDsnpMultiHash = async (fileBuffer: Buffer): Promise<string> => {
  // Hash with sha256 which prefixes with multihash
  const hashed = await sha256.digest(fileBuffer);
  // Encode with base32
  return base32.encode(hashed.bytes);
};

export function isNotNull<T>(x: T | null): x is T {
  return x !== null;
}
