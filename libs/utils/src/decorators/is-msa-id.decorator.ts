import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function isValidMsa(value: unknown): boolean {
  // no leading zeros are accepted since this would cause different DsnpUserUri to be valid for the same user
  const re = /^[1-9][0-9]*$/;

  return (typeof value === 'string' && re.test(value)) || typeof value === 'number';
}

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
          return isValidMsa(value);
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a valid positive number!`;
        },
      },
    });
  };
}
