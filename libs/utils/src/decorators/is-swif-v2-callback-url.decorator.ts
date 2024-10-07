import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsSwifV2CallbackUrl(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsSwifV2CallbackUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return false;
          try {
            const url = new URL(value);
            return url.search === '' && url.hash === '';
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid URL without query parameters`;
        },
      },
    });
  };
}
