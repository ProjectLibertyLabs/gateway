// NOTE: The constraint class needs to be registered with a module as a provider and imported into any module
// that wants to use the decorator. In this case, we'll register with the BlockchainModule,

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';

@ValidatorConstraint({ name: 'IsIntentName', async: true })
@Injectable()
export class IsIntentNameConstraint implements ValidatorConstraintInterface {
  constructor(private readonly blockchainRpcService: BlockchainRpcQueryService) {}

  async validate(value: any, _args: ValidationArguments): Promise<boolean> {
    if (
      typeof value === 'string' &&
      /^([a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9])\.([a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9])$/.test(value)
    ) {
      const response = await this.blockchainRpcService.getIntentNamesToIds([value]);
      return response.length > 0;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} "${args.value}" must be a registered intent name.`;
  }
}

export function IsIntentName(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsIntentName',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsIntentNameConstraint,
      async: true,
    });
  };
}
