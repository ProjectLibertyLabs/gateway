import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { isValidMsa } from '#utils/decorators/is-msa-id.decorator';
import { validateContentHash } from '#utils/decorators/is-dsnp-content-hash.decorator';

export function IsDsnpContentURI(validationOptions?: ValidationOptions) {
   
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDsnpContentURI',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          const re = /^(?<protocol>.*):\/\/(?<msaId>[\d]*)\/(?<contentHash>.*)$/;

          if (typeof value !== 'string') {
            console.error('Invalid DSNP Content URI');
            return false;
          }

          const result = re.exec(value);
          if (!result || !result?.groups) {
            return false;
          }

          const { protocol, msaId, contentHash } = result.groups;
          if (protocol !== 'dsnp') {
            console.error('DSNP URI protocol must be "dsnp"');
            return false;
          }

          if (!isValidMsa(msaId)) {
            return false;
          }

          if (!validateContentHash(contentHash)) {
            return false;
          }

          return true;
        },
        defaultMessage(args?: ValidationArguments): string {
          return `${args.property} should be a valid DsnpContentURI!`;
        },
      },
    });
  };
}
