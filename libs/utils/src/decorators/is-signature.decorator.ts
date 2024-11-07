import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

interface IsSignatureValidationOption extends ValidationOptions {
  requiresSignatureType?: boolean | undefined;
}

/**
 * Validating a singular SR25519 signature or a valid MultiSignature of Sr25519, Ed25519 or Ecdsa
 * @param validationOptions
 * @constructor
 */
export function IsSignature(validationOptions?: IsSignatureValidationOption) {
   
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsSignature',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^0x[A-F0-9]{128,132}$/i;

          if (typeof value !== 'string') {
            return false;
          }

          // ensure the length is always even
          if (re.test(value) && value.length % 2 === 0) {
            if (validationOptions?.requiresSignatureType && value.length - 2 < 130) {
              return false;
            }

            // check if valid MultiSignature of Ecdsa
            if (value.length - 2 === 132 && !value.startsWith('02', 2)) {
              return false;
            }

            // check if valid MultiSignature of Ed25519 or Sr25519
            if (value.length - 2 === 130 && !(value.startsWith('00', 2) || value.startsWith('01', 2))) {
              return false;
            }

            return true;
          }

          return false;
        },
        defaultMessage(args?: ValidationArguments): string {
          if (validationOptions?.requiresSignatureType) {
            return `${args.property} should be a valid 65-66 bytes MultiSignature value in hex!`;
          }
          return `${args.property} should be a valid 64 bytes Sr25519 signature value in hex! Or a valid 65-66 bytes MultiSignature value in hex!`;
        },
      },
    });
  };
}
