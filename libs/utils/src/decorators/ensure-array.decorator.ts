import { Transform } from 'class-transformer';

export const EnsureArray = Transform(({ value }) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
});
