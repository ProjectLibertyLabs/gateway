import { defineConfig, UserConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: 'axios',
  exportCore: false,
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: 'types'
  },
  schemas: false,
  services: false,
  types: {
    enums: 'typescript'
  }
} as UserConfig);
