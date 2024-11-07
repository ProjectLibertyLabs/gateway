import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { isValidMsa } from '#utils/decorators/is-msa-id.decorator';

export function IsDsnpUserURI(validationOptions?: ValidationOptions) {
   
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDsnpUserURI',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^(?<protocol>.*):\/\/(?<msaId>[\d]*)$/;

          if (typeof value !== 'string') {
            console.error('Invalid DSNP User URI');
            return false;
          }

          const result = re.exec(value);
          if (!result || !result?.groups) {
            return false;
          }

          const { protocol, msaId } = result.groups;
          if (protocol !== 'dsnp') {
            console.error('DSNP URI protocol must be "dsnp"');
            return false;
          }

          if (!isValidMsa(msaId)) {
            return false;
          }

          return true;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a valid DsnpUserURI!`;
        },
      },
    });
  };
}
