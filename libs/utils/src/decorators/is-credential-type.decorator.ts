import { KnownCredentialTypes } from '@projectlibertylabs/siwfv2';
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsCredentialType(validationOptions?: ValidationOptions) {
   
  return function (object: object, propertyName: string) {
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
