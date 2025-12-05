import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsSchemaId(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsSchemaId',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^[0-9]+$/;

          if ((typeof value === 'string' && re.test(value)) || typeof value === 'number') {
            const numberValue = Number(value);
            // ensure the value is up to u16
            return numberValue > 0 && numberValue <= 65_535;
          }

          return false;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a positive number!`;
        },
      },
    });
  };
}
