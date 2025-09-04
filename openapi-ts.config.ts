import { defineConfig, UserConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '',
  exportCore: false,
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: 'types',
  },
  plugins: [
    {
      dates: true,
      name: '@hey-api/transformers',
    },
    {
      identifierCase: 'preserve',
      enums: 'typescript',
      enumsCase: 'preserve',
      name: '@hey-api/typescript',
    },
  ],
  schemas: false,
  services: false,
} as UserConfig);
