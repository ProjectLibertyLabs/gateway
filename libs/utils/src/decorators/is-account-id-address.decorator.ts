import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

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

          const isValidHex = hexPattern.test(value) && value.length % 2 === 0;
          return isValidHex || ss58Pattern.test(value);
        },
      },
    });
  };
}
