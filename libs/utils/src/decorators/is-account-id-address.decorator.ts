import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { encodeAddress } from '@polkadot/keyring';
import { hexToU8a } from '@polkadot/util';

export function IsAccountIdOrAddress(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsAccountIdOrAddress',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const hexPattern = /^0x[A-F0-9]{64}$/i;
          const ss58Pattern = /^[1-9A-HJ-NP-Za-km-z]{46,50}$/;

          if (typeof value !== 'string') {
            return false;
          }

          try {
            if (hexPattern.test(value) && value.length % 2 === 0) {
              // we need the lower case '0x' since hexToU8a only checks for the lowercase match
              encodeAddress(hexToU8a(value.toLowerCase()));
              return true;
            }
            if (ss58Pattern.test(value)) {
              encodeAddress(value);
              return true;
            }
          } catch (error) {
            // invalid account throws error
          }
          return false;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a valid 32 bytes representing an account Id or address in Hex or SS58 format!`;
        },
      },
    });
  };
}
