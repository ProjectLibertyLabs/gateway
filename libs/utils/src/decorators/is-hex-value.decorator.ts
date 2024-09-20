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
        defaultMessage(args?: ValidationArguments): string {
          if (validationOptions.minLength === validationOptions.maxLength) {
            return `${args.property} should be in hex format with length of ${validationOptions.minLength / 2} bytes!`;
          } else if (validationOptions.maxLength === undefined) {
            return `${args.property} should be in hex format with a minimum length of ${validationOptions.minLength / 2} bytes!`;
          }
          return `${args.property} should be be in hex format with a length between ${validationOptions.minLength / 2} and ${validationOptions.maxLength / 2} bytes.`;
        },
      },
    });
  };
}
