import { SCHEMA_NAME_TO_ID } from '#types/constants/schemas';
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsSchemaName(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsSchemaName',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return SCHEMA_NAME_TO_ID.has(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} value "${args.value}" is not a known valid permission.`;
        },
      },
    });
  };
}
