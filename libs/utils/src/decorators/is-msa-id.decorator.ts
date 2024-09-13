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
          const re = /^[1-9][0-9]*$/;

          let numberValue;
          if ((typeof value === 'string' && re.test(value)) || typeof value === 'number') {
            numberValue = BigInt(value);
          } else {
            return false;
          }

          // ensure the value is up to u32
          return numberValue <= 4_294_967_296;
        },
      },
    });
  };
}
