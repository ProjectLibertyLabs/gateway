import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function validateContentHash(contentHash: unknown): boolean {
  if (typeof contentHash !== 'string') {
    console.error('Invalid DSNP Content Hash');
    return false;
  }
  const re = /^[A-Z2-7]+=*$/i;
  return re.test(contentHash) && contentHash.length % 8 === 0;

  // TODO: add semantic check in another PR
  // try {
  //   const decoded = base32.decode(contentHash.toLowerCase());
  //
  //   const hexMatch = hexRe.exec(contentHash);
  //   if (hexMatch && hexMatch?.groups) {
  //     const { hexString } = hexMatch.groups;
  //     CID.decode(decoded);
  //   } else {
  //     CID.parse(contentHash);
  //   }
  // } catch (err: any) {
  //   console.error(`Invalid multiformat content hash: ${err.message}`);
  //   return false;
  // }
  // return true;
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
