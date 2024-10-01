import { Transform } from 'class-transformer';

/**
 * Transformer to ensure that the value is an array and will make it an array of one value if it isn't one.
 * Example: GET Query strings will default to a string not an array if you only send one value, this will transform that single value into an array of 1 or an empty array if no value.
 */
export const EnsureArray = Transform(({ value }) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
});
