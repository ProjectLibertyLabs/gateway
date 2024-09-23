import { registerAs } from '@nestjs/config';
import Joi, { allow } from 'joi';
import * as JoiUtil from '#config/joi-utils';
import { ValidationError } from 'class-validator';
import { ICapacityLimits } from '#types/interfaces';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';

export interface IBlockchainConfig {
  frequencyUrl: URL;
  isDeployedReadOnly: boolean;
  providerId: bigint;
  providerSeedPhrase: string;
  capacityLimit: ICapacityLimits;
}

export async function addressFromSeedPhrase(seed: string): Promise<string> {
  await cryptoWaitReady();
  return new Keyring({ type: 'sr25519' }).createFromUri(seed).address;
}

const capacityLimitSchema = Joi.object({
  type: Joi.any().valid('percentage', 'amount').required(),
  value: Joi.any().when('type', {
    is: 'percentage',
    then: Joi.number().positive().max(100),
    otherwise: JoiUtil.bigintSchema({ convert: true }),
  }),
});

const capacityLimitsSchema = Joi.object({
  serviceLimit: capacityLimitSchema.required(),
  totalLimit: capacityLimitSchema,
});

const doRegister = (allowReadOnly = false) =>
  registerAs('blockchain', (): IBlockchainConfig => {
    const seedValidation = allowReadOnly
      ? Joi.string().optional().allow(null).allow('').empty('')
      : Joi.string().required();
    const configs: JoiUtil.JoiConfig<IBlockchainConfig> = {
      frequencyUrl: {
        value: process.env.FREQUENCY_URL,
        joi: Joi.string()
          .uri({ scheme: ['http', 'https', 'ws', 'wss'] })
          .required()
          .custom((v) => new URL(v)),
      },
      providerId: {
        value: process.env.PROVIDER_ID,
        joi: Joi.required().custom((value: string, helpers) => {
          try {
            const id = BigInt(value);
            if (id < 0n) {
              throw new Error('Provider ID must be > 0');
            }
          } catch (e) {
            return helpers.error('any.invalid');
          }
          return value;
        }),
      },
      providerSeedPhrase: {
        value: process.env.PROVIDER_ACCOUNT_SEED_PHRASE,
        joi: seedValidation,
      },
      isDeployedReadOnly: {
        value: process.env.PROVIDER_ACCOUNT_SEED_PHRASE,
        joi: seedValidation
          .default(() => allowReadOnly)
          .custom((v) => {
            if (!v || (!v.trim() && allowReadOnly)) {
              return true;
            }

            return false;
          }),
      },
      capacityLimit: {
        value: process.env.CAPACITY_LIMIT,
        joi: Joi.string()
          .custom((value: string, helpers) => {
            try {
              const obj = JSON.parse(value);

              const result1 = capacityLimitSchema.validate(obj);
              const result2 = capacityLimitsSchema.validate(obj);

              if (obj?.type && result1.error) {
                return helpers.error('any.custom', { error: result1.error });
              }

              if (obj?.serviceLimit && result2.error) {
                throw result2.error;
              }

              if (result1.error && result2.error) {
                return helpers.error('any.custom', {
                  error: new Error('JSON object does not conform to the required structure'),
                });
              }
            } catch (e) {
              if (e instanceof ValidationError) {
                throw e;
              }

              return helpers.error('any.custom', { error: e });
            }

            const obj = JSON.parse(value, (k, v) => {
              if (k === 'value') {
                return BigInt(v);
              }

              return v;
            });

            if (obj?.type) {
              return {
                serviceLimit: obj,
              };
            }
            return obj;
          })
          .required(),
      },
    };

    return JoiUtil.validate<IBlockchainConfig>(configs);
  });

export const allowReadOnly = doRegister(true);

export default doRegister();
