import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsSignature(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsSignature',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^0x[A-F0-9]{128,130}$/i;

          if (typeof value !== 'string') {
            return false;
          }

          // ensure the length is always even
          return re.test(value) && value.length % 2 === 0;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a 64 (or 65 if it is MultiSignature type) bytes value in hex format!`;
        },
      },
    });
  };
}
