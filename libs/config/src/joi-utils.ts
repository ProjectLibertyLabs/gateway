import Joi, { Schema, SchemaMap } from 'joi';

interface ConfigProps {
  value: unknown;
  joi: Schema;
}

interface IBigIntOptions {
  convert: boolean;
}

export type JoiConfig<T> = Record<keyof T, ConfigProps>;

export const bigintSchema = (options?: IBigIntOptions) =>
  Joi.custom((value) => {
    const strResult = Joi.string().validate(value);
    if (strResult.error) {
      throw strResult.error;
    }

    const numResult = Joi.number().unsafe().positive().validate(value);
    if (numResult.error) {
      throw numResult.error;
    }

    if (options?.convert) {
      return BigInt(value);
    }

    return value;
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

  console.log('ENV Values: ', v);
  return v;
}
