import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { CID } from 'multiformats';

export function validateCidV1(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const cid = CID.parse(value);

    if (cid.version !== 1) {
      return false;
    }
  } catch (_err: any) {
    return false;
  }
  return true;
}

export function IsCidV1(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCidV1',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (!validateCidV1(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a valid CIDv1!`;
        },
      },
    });
  };
}
