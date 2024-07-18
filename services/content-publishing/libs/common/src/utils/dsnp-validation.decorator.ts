import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { base16 } from 'multiformats/bases/base16';
import { CID } from 'multiformats';

const MAX_U64_BIGINT = 18_446_744_073_709_551_615n;

function validateMsaIdString(msaId: string): boolean {
  if (msaId.startsWith('0')) {
    console.error('DSNP User ID may not contain a leading zero');
    return false;
  }

  try {
    const uid = BigInt(msaId);
    if (uid > MAX_U64_BIGINT) {
      throw new RangeError();
    }
  } catch (err) {
    console.error('Invalid DSNP User ID in URI');
    return false;
  }

  return true;
}

const hexRe = /^(?:0x)?(?<hexString>f[0-9a-f]+)$/i;
function validateContentHash(contentHash: string): boolean {
  try {
    const hexMatch = hexRe.exec(contentHash);
    if (hexMatch && hexMatch?.groups) {
      const { hexString } = hexMatch.groups;
      const decoded = base16.decode(hexString.toLowerCase());
      CID.decode(decoded);
    } else {
      const cid = CID.parse(contentHash);
      console.log(cid.toString(base16.encoder));
    }
  } catch (err: any) {
    console.error(`Invalid multiformat content hash: ${err.message}`);
    return false;
  }

  return true;
}

export function IsDsnpUserURI(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDsnpUserURI',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^(?<protocol>.*):\/\/(?<msaId>[\d]*)$/;

          if (typeof value !== 'string') {
            console.error('Invalid DSNP User URI');
            return false;
          }

          const result = re.exec(value);
          if (!result || !result?.groups) {
            return false;
          }

          const { protocol, msaId } = result.groups;
          if (protocol !== 'dsnp') {
            console.error('DSNP URI protocol must be "dsnp"');
            return false;
          }

          if (!validateMsaIdString(msaId)) {
            return false;
          }

          return true;
        },
      },
    });
  };
}

export function IsDsnpContentURI(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDsnpContentURI',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^(?<protocol>.*):\/\/(?<msaId>[\d]*)\/(?<contentHash>.*)$/;

          if (typeof value !== 'string') {
            console.error('Invalid DSNP Content URI');
            return false;
          }

          const result = re.exec(value);
          if (!result || !result?.groups) {
            return false;
          }

          const { protocol, msaId, contentHash } = result.groups;
          if (protocol !== 'dsnp') {
            console.error('DSNP URI protocol must be "dsnp"');
            return false;
          }

          if (!validateMsaIdString(msaId)) {
            return false;
          }

          if (!validateContentHash(contentHash)) {
            return false;
          }

          return true;
        },
      },
    });
  };
}

export function IsDsnpContentHash(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDsnpContentHash',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') {
            console.error('Invalid DSNP Content Hash');
            return false;
          }

          if (!validateContentHash(value)) {
            return false;
          }

          return true;
        },
      },
    });
  };
}
