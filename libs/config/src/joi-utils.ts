import Joi, { Schema, SchemaMap } from 'joi';

interface ConfigProps {
  value: unknown;
  joi: Schema;
}

interface IBigIntOptions {
  convert: boolean;
}

export type JoiConfig<T> = Record<keyof T & 'label', ConfigProps>;

export const bigintSchema = (options?: IBigIntOptions) =>
  Joi.custom((value) => {
    const result = Joi.alternatives().try(Joi.string(), Joi.number().unsafe().positive()).validate(value);
    if (result.error) {
      throw result.error;
    }

    const converted = BigInt(value);
    return options?.convert ? converted : value;
  });

export function normalizeConfigNames<T>(config: JoiConfig<T>): JoiConfig<T> {
  const updatedConfig = { ...config };

  // eslint-disable-next-line no-restricted-syntax
  for (const key in updatedConfig) {
    if (Object.prototype.hasOwnProperty.call(updatedConfig, key)) {
      if (updatedConfig[key]?.label) {
        updatedConfig[key].joi = updatedConfig[key].joi.label(updatedConfig[key].label);
      }

      if (!updatedConfig[key]?.value) {
        updatedConfig[key].value = process.env[updatedConfig[key].label];
      }
    }
  }

  return updatedConfig;
}

export const jsonObjectSchema = Joi.string()
  .optional()
  .allow('')
  .custom((value, helpers) => {
    let parsed: object;
    try {
      parsed = JSON.parse(value) as object;
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return helpers.error('jsonObject.nonObject');
      }
    } catch (err: any) {
      return helpers.error('jsonObject.invalid');
    }
    return parsed;
  }, 'Custom JSON parser')
  .messages({
    'jsonObject.invalid': '{{#label}} must be a valid JSON string',
    'jsonObject.nonObject': '{{#label}} must be a valid JSON object string, not an array or primitive',
  });

/**
 * Extract only a single property from our configuration object.
 * @param config    Entire configuration object.
 * @param propName  The property name that we want to extract.
 */
function extractByPropName<T>(config: JoiConfig<T>, propName: keyof ConfigProps): T | SchemaMap<T> {
  /*
      Result example;
      [
        { propName: ... },
        { propName: ... }
      ]
     */
  const arr: any[] = Object.keys(config).map((key) => ({
    [key]: config[key][propName],
  }));

  /*
      Result example;
      {
        propName: ...,
        propName: ...
      }
     */
  return Object.assign({}, ...arr);
}

/**
 * Throws an exception if required environment variables haven't been provided
 * or if they don't meet our Joi validation rules.
 */
export function validate<T>(config: JoiConfig<T>): T {
  const schemaObj = extractByPropName(config, 'joi') as SchemaMap<T>;
  const schema = Joi.object(schemaObj);
  const values = extractByPropName(config, 'value') as T;

  const { value: v, error } = schema.validate(values, { abortEarly: false });
  if (error) {
    throw new Error(
      `Validation failed:
        ${error.message}`,
    );
  }
  return v;
}
