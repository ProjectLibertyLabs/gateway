import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsMsaId(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsMsaId',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^[0-9]+$/;

          if (typeof value === 'string' && re.test(value)) {
            return Number(value) > 0;
          } else if (typeof value === 'number') {
            return value > 0;
          }
          return false;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a valid positive number!`;
        },
      },
    });
  };
}
