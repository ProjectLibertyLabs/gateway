import { KnownCredentialTypes } from '@projectlibertylabs/siwa';
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsCredentialType(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsCredentialType',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return KnownCredentialTypes.has(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} has unknown credential type: "${args.value}"`;
        },
      },
    });
  };
}
