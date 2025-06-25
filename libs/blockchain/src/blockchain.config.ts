import { registerAs } from '@nestjs/config';
import Joi from 'joi';
import * as JoiUtil from '#config/joi-utils';
import { ValidationError } from 'class-validator';
import { ICapacityLimits } from '#types/interfaces';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import Keyring from '@polkadot/keyring';

export interface IBlockchainNonProviderConfig {
  frequencyTimeoutSecs: number;
  frequencyApiWsUrl: URL;
  isDeployedReadOnly: boolean;
}

// providerId:  a unique numeric identifier, typically the Provider MSA ID.
// providerKeyUriOrPrivateKey: The URI of a key, usually a seed phrase, but may also include test accounts such as `//Alice` or `//Bob`. * @param {string} callbackUri - The URI that the user should return to after authenticating. Or the private key in hex format for Ethereum keys.
// capacityLimit:  the maximum capacity in the Provider account referenced by `providerId`.
export interface IBlockchainConfig extends IBlockchainNonProviderConfig {
  providerId: bigint;
  providerKeyUriOrPrivateKey: string;
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

// eslint-disable-next-line no-shadow
enum ChainMode {
  PROVIDER_SEED_REQUIRED,
  PROVIDER_SEED_OPTIONAL,
  NO_PROVIDER,
}

const doRegister = (mode: ChainMode = ChainMode.PROVIDER_SEED_REQUIRED) =>
  registerAs('blockchain', (): IBlockchainConfig => {
    let seedValidation: Joi.Schema;
    let providerIdValidation: Joi.Schema;
    let readOnlyValidation: Joi.Schema;

    switch (mode) {
      case ChainMode.NO_PROVIDER:
        seedValidation = Joi.any().strip();
        providerIdValidation = Joi.any().strip();
        readOnlyValidation = Joi.boolean().optional().default(true);
        break;

      case ChainMode.PROVIDER_SEED_OPTIONAL:
        seedValidation = Joi.string().trim().optional().allow(null).allow('').empty('');
        providerIdValidation = JoiUtil.bigintSchema().required();
        readOnlyValidation = Joi.boolean().default(
          Joi.ref('providerKeyUriOrPrivateKey', {
            adjust: (value: string | undefined) => !value || value.trim().length === 0, // Check if providerKeyUriOrPrivateKey is non-empty
          }),
        );

        break;

      case ChainMode.PROVIDER_SEED_REQUIRED:
      default:
        seedValidation = Joi.string().required().trim().min(1);
        providerIdValidation = JoiUtil.bigintSchema().required();
        readOnlyValidation = Joi.boolean().optional().default(false);
        break;
    }

    const configs: JoiUtil.JoiConfig<IBlockchainConfig> = JoiUtil.normalizeConfigNames({
      frequencyTimeoutSecs: {
        label: 'FREQUENCY_TIMEOUT_SECS',
        joi: Joi.number().positive().default(60),
      },
      frequencyApiWsUrl: {
        label: 'FREQUENCY_API_WS_URL',
        joi: Joi.string()
          .uri({ scheme: ['http', 'https', 'ws', 'wss'] })
          .required()
          .custom((v) => new URL(v)),
      },
      providerId: {
        label: 'PROVIDER_ID',
        joi: providerIdValidation,
      },
      providerKeyUriOrPrivateKey: {
        label: 'PROVIDER_ACCOUNT_SEED_PHRASE',
        joi: seedValidation,
      },
      isDeployedReadOnly: {
        value: undefined,
        joi: readOnlyValidation,
      },
      capacityLimit: {
        label: 'CAPACITY_LIMIT',
        joi: Joi.when('isDeployedReadOnly', {
          is: true,
          then: Joi.any().strip(),
          otherwise: Joi.string()
            .required()
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
            }),
        }),
      },
    });

    return JoiUtil.validate(configs);
  });

export const allowReadOnly = doRegister(ChainMode.PROVIDER_SEED_OPTIONAL);
export const noProviderBlockchainConfig = doRegister(ChainMode.NO_PROVIDER);

export default doRegister();
