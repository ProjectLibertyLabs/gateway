import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './openapi-specs/account-webhooks.openapi.yaml',
  output: {
    path: 'libs/types/src/account-webhook',
    postProcess: ['eslint', 'prettier'],
  },
  plugins: [
    {
      name: '@hey-api/sdk',
      client: '@hey-api/client-axios',
    },
    {
      name: '@hey-api/transformers',
      dates: true,
    },
    {
      name: '@hey-api/typescript',
      case: 'preserve',
      enums: {
        mode: 'typescript',
        case: 'preserve',
      },
    },
  ],
});
