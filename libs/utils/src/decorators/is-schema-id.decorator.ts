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
          const re = /^[1-9][0-9]*$/;

          if ((typeof value === 'string' && re.test(value)) || typeof value === 'number') {
            const numberValue = BigInt(value);
            // ensure the value is up to u16
            return numberValue <= 65_536;
          }

          return false;
        },
      },
    });
  };
}
