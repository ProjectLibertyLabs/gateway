import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsHexPublicKey(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsHexPublicKey',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^0x[A-F0-9]{64}$/i;

          if (typeof value !== 'string') {
            console.error('Invalid Public key');
            return false;
          }

          return re.test(value);
        },
      },
    });
  };
}
