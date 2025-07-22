import * as ipfsHash from 'ipfs-only-hash';
import { CID } from 'multiformats';
import { sha256 } from 'multiformats/hashes/sha2';
import { base32 } from 'multiformats/bases/base32';
import { create } from 'multiformats/hashes/digest';
import Stream from 'stream';
import { createHash } from 'crypto';

export async function delayMS(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function calculateIpfsCID(buffer: Buffer): Promise<string> {
  const v0 = await ipfsHash.of(buffer);
  return CID.parse(v0).toV1().toString();
}

export async function calculateDsnpMultiHash(fileBuffer: Buffer): Promise<string> {
  // Hash with sha256 which prefixes with multihash
  const hashed = await sha256.digest(fileBuffer);
  // Encode with base32
  return base32.encode(hashed.bytes);
}

export function isNotNull<T>(x: T | null): x is T {
  return x !== null;
}

async function calculateDsnpMultiHashFromRawHash(rawHash: Buffer): Promise<string> {
  const multihash = create(sha256.code, rawHash);
  return base32.encode(multihash.bytes);
}

// The multihash package that's part of 'multiformats' doesn't support incremental hashing.
// So, we use the standard Node 'crypto' sha2-256 hash to incrementally hash the file as it streams in,
// then pass the raw hash to 'multihash' to get the multihash representation. Finally, we encode as base32 multiformat.
export async function calculateIncrementalDsnpMultiHash(stream: Stream | AsyncIterable<Uint8Array>): Promise<string> {
  const hash = createHash('sha256');

  // Handle a file stream (ie, from our upload endpoint)
  if (stream instanceof Stream) {
    stream.on('data', (chunk) => hash.update(chunk));
    return new Promise<string>((resolve, reject) => {
      stream.once('end', async () => resolve(calculateDsnpMultiHashFromRawHash(hash.digest())));
      stream.once('error', reject);
    });
  }

  // Else, handle an async byte array (such as fetched from IPFS)
  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return calculateDsnpMultiHashFromRawHash(hash.digest());
}

export function validateEnvironmentVariables(logger?: any): void {
  logger?.warn(`Environment variables: ${JSON.stringify(process.env, null, 2)}`);

  if ('DEBUG' in process.env) {
    logger?.warn(
      `
      The DEBUG environment variable has been removed. Use LOG_LEVEL and PRETTY instead (see documentation).
      Current defaults: LOG_LEVEL=info, PRETTY=false.
      `,
    );
  }
}
