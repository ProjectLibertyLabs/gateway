// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off',
      'linebreak-style': ['error', 'unix'],
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ignores: ['openapi-specs/*'],
  },
  // Test files can bypass some rules
  {
    files: ['**/*spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // Generated files
  {
    files: ['**/content-announcement/*', '**/account-webhook/*'],
    rules: {
      'no-use-before-define': 'off',
      'no-shadow': 'off',
    },
  },
);

// /* eslint-env node */
// module.exports = {
//   env: {
//     browser: true,
//     es2021: true,
//   },
//   extends: ['airbnb-base', 'plugin:import/typescript', 'prettier'],
//   parser: '@typescript-eslint/parser',
//   parserOptions: {
//     project: './tsconfig.json',
//     sourceType: 'module',
//   },
//   ignorePatterns: ['**/k6-test'],
//   plugins: ['@typescript-eslint', 'import', 'unused-imports', 'prettier'],
//   root: true,
//   rules: {
//     'no-console': 'off',
//     'import/extensions': [
//       'error',
//       'ignorePackages',
//       {
//         js: 'never',
//         jsx: 'never',
//         ts: 'never',
//         tsx: 'never',
//       },
//     ],
//     'import/no-unresolved': [
//       2,
//       {
//         commonjs: true,
//         amd: true,
//       },
//     ],
//     'import/named': 2,
//     'import/namespace': 2,
//     'import/default': 2,
//     'import/export': 2,
//     'import/prefer-default-export': 'off',
//     indent: 'off',
//     'no-unused-vars': 'off',
//     'unused-imports/no-unused-imports': 'error',
//     'unused-imports/no-unused-vars': [
//       'error',
//       {
//         vars: 'all',
//         varsIgnorePattern: '^_',
//         args: 'all',
//         argsIgnorePattern: '^_',
//       },
//     ],
//     'prettier/prettier': 2,
//     'no-undef': 'off',
//     'import/order': 'off',
//     'no-await-in-loop': 'off',
//     'no-useless-constructor': 'off',
//     'no-empty-function': 'warn',
//   },
//   settings: {
//     'import/extensions': [
//       'error',
//       'ignorePackages',
//       {
//         js: 'never',
//         jsx: 'never',
//         ts: 'never',
//         tsx: 'never',
//       },
//     ],
//     'import/parsers': {
//       '@typescript-eslint/parser': ['.ts', '.tsx'],
//     },
//     'import/resolver': {
//       typescript: {
//         directory: './tsconfig.json',
//       },
//       node: {
//         extensions: ['.js', '.jsx', '.ts', '.d.ts', '.tsx'],
//       },
//     },
//   },
//   overrides: [],
// };
