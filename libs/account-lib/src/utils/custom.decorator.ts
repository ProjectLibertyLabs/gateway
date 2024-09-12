import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsHexValue(validationOptions?: IsHexValueValidationOption) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsHexPublicKey',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const pattern =  `^0x[A-F0-9]{${validationOptions.minLength},${validationOptions.maxLength ?? ""}}$`;
          console.log(pattern);
          const re = new RegExp(pattern, 'i');

          if (typeof value !== 'string') {
            console.error('Invalid Public key');
            return false;
          }

          if (re.test(value)) {
            // ensure the length is always even
            return value.length % 2 === 0;
          }

          return false;
        },
      },
    });
  };
}

interface IsHexValueValidationOption extends ValidationOptions {
  minLength: number;
  maxLength?: number | undefined;
}
