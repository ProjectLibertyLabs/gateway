import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

interface IsHexValueValidationOption extends ValidationOptions {
  minLength: number;
  maxLength?: number | undefined;
}

export function IsHexValue(validationOptions?: IsHexValueValidationOption) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsHexValue',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const pattern = `^0x[A-F0-9]{${validationOptions.minLength},${validationOptions.maxLength ?? ''}}$`;
          const re = new RegExp(pattern, 'i');

          if (typeof value !== 'string') {
            return false;
          }

          // ensure the length is always even
          return re.test(value) && value.length % 2 === 0;
        },
      },
    });
  };
}

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
          const ss58Pattern = /^[1-9A-HJ-NP-Za-km-z]{48}$/;

          if (typeof value !== 'string') {
            return false;
          }

          const isValidHex = hexPattern.test(value) && value.length % 2 === 0;
          return isValidHex || ss58Pattern.test(value);
        },
      },
    });
  };
}
