import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { base32 } from 'multiformats/bases/base32';
import { varint } from 'multiformats';
import { u8aToHex } from '@polkadot/util';

export function validateContentHash(contentHash: unknown): boolean {
  if (typeof contentHash !== 'string') {
    return false;
  }
  const re = /^[A-Z2-7]+=*$/i;
  if (!re.test(contentHash)) {
    return false;
  }

  try {
    if (contentHash.length === 46 && contentHash.startsWith('Qm')) {
      console.error('CIDv0 unsupported');
      return false; // CIDv0 unsupported
    }

    const decoded = base32.decode(contentHash.toLowerCase());

    const [version, versionLength] = varint.decode(decoded, 0);
    // version <= 0 is malformed
    // version == 1 is CIDv1
    // version > 1 is reserved for future use
    if (version !== 1) {
      console.error(`Unsupported CID version: ${version}`);
      return false;
    }

    const [_multicodec, multicodecLength] = varint.decode(decoded, versionLength);
    const hash = decoded.slice(versionLength + multicodecLength);

    const hex = u8aToHex(hash).toLowerCase();

    // The DSNP spec only allows Blake3 or SHA2-256 hashes: https://spec.dsnp.org/DSNP/Identifiers.html#supported-hashing-algorithms
    // check blake3   hash 0x1e20 -> 0x1e for (blake3)   and hash length (0x20 for 32 bytes)
    // check sha2-256 hash 0x1220 -> 0x12 for (sha2-256) and hash length (0x20 for 32 bytes)
    if (!(hex.startsWith('0x1e20') || hex.startsWith('0x1220'))) {
      console.error(`Unsupported hashing algorithm: ${hex.slice(0, 4)} (${contentHash})`);
      return false;
    }
  } catch (err: any) {
    console.error(`ERROR: ${JSON.stringify(err)}`);
    return false;
  }
  return true;
}

export function IsDsnpContentHash(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDsnpContentHash',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (!validateContentHash(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a valid DsnpContentHash!`;
        },
      },
    });
  };
}
