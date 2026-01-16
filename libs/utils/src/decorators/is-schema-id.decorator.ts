import { isNumber, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

function IsU16(decoratorName: string) {
  return function (validationOptions?: ValidationOptions) {
    // eslint-disable-next-line func-names
    return function (object: object, propertyName: string) {
      registerDecorator({
        name: decoratorName,
        target: object.constructor,
        propertyName,
        options: validationOptions,
        validator: {
          validate(value: unknown, _args: ValidationArguments) {
            const re = /^[0-9]+$/;

            if ((typeof value === 'string' && re.test(value)) || typeof value === 'number') {
              const numberValue = Number(value);
              // ensure the value is up to u16
              return isNumber(numberValue, { maxDecimalPlaces: 0 }) && numberValue > 0 && numberValue <= 65_535;
            }

            return false;
          },
          defaultMessage(args?: ValidationArguments): string {
            const value = Number(args.value);
            if (value && value > 65_535) {
              return `${args.property} should not exceed 65535!`;
            }
            return `${args.property} should be a positive integer!`;
          },
        },
      });
    };
  };
}

export const IsSchemaId = IsU16('IsSchemaId');
export const IsIntentId = IsU16('IsIntentId');
export const IsIntentGroupId = IsU16('IsIntentGroupId');
