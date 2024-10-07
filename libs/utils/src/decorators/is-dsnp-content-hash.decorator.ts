import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { base32 } from 'multiformats/bases/base32';
import { u8aToHex } from '@polkadot/util';

export function validateContentHash(contentHash: unknown): boolean {
  if (typeof contentHash !== 'string') {
    return false;
  }
  const re = /^[A-Z2-7]+=*$/i;
  // check multihash size hash identifier 2 bytes + hash value 32 bytes
  if (!(re.test(contentHash) && contentHash.length !== 34)) {
    return false;
  }

  try {
    const decoded = base32.decode(contentHash.toLowerCase());
    const hex = u8aToHex(decoded).toLowerCase();

    // check blake3   hash 0x1e20 -> 0x1e for (blake3)   and hash length (0x20 for 32 bytes)
    // check sha2-256 hash 0x1220 -> 0x12 for (sha2-256) and hash length (0x20 for 32 bytes)
    if (!(hex.startsWith('0x1e20') || hex.startsWith('0x1220'))) {
      return false;
    }
  } catch (err: any) {
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
