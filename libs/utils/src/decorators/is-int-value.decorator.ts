import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

interface IsIntValueValidationOption extends ValidationOptions {
  minValue?: number | undefined;
  maxValue?: number | undefined;
}

export function IsIntValue(validationOptions?: IsIntValueValidationOption) {
  // eslint-disable-next-line func-names
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsIntValue',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^[+-]?[0-9]+$/;

          if ((typeof value === 'string' && re.test(value)) || typeof value === 'number') {
            const numberValue = BigInt(value);

            let result = true;
            if (validationOptions.minValue !== undefined) {
              result = validationOptions.minValue <= numberValue;
            }
            if (validationOptions.maxValue !== undefined) {
              result = result && validationOptions.maxValue >= numberValue;
            }
            return result;
          }

          return false;
        },
        defaultMessage(args?: ValidationArguments): string {
          if (validationOptions.maxValue === undefined && validationOptions.minValue !== undefined) {
            return `${args.property} should be a number greater than or equal to ${validationOptions.minValue}!`;
          }
          if (validationOptions.maxValue !== undefined && validationOptions.minValue === undefined) {
            return `${args.property} should be a number less than or equal to ${validationOptions.maxValue}!`;
          }
          return `${args.property} should be a number between ${validationOptions.minValue} and ${validationOptions.maxValue}!`;
        },
      },
    });
  };
}
