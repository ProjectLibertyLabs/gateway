const { defineConfig, globalIgnores } = require('eslint/config');

const globals = require('globals');

const { fixupConfigRules, fixupPluginRules } = require('@eslint/compat');

const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');

const _import = require('eslint-plugin-import');
const unusedImports = require('eslint-plugin-unused-imports');
const prettier = require('eslint-plugin-prettier');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

// Project-specific rule collections
const bestPractices = require('./eslint-rules/best_practices');
const nodeConfigs = require('./eslint-rules/node');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },

      parser: tsParser,
      sourceType: 'module',

      parserOptions: {
        project: './tsconfig.json',
      },
    },

    extends: [fixupConfigRules(compat.extends('plugin:import/typescript', 'prettier'))],

    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: fixupPluginRules(_import),
      'unused-imports': unusedImports,
      prettier,
    },

    rules: {
      ...bestPractices.rules,
      ...nodeConfigs.rules,

      'no-console': 'off',

      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],

      'import/no-unresolved': [
        2,
        {
          commonjs: true,
          amd: true,
        },
      ],

      'import/named': 2,
      'import/namespace': 2,
      'import/default': 2,
      'import/export': 2,
      'import/no-extraneous-dependencies': 0,
      'import/no-relative-packages': 2,
      'import/prefer-default-export': 'off',
      'prettier/prettier': 2,
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'always',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off', // TODO: fix for type safety
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true, // ignores ...foo after _bar
        },
      ],
    },

    settings: {
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],

      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },

      'import/resolver': {
        typescript: {
          directory: './tsconfig.json',
        },

        node: {
          extensions: ['.js', '.jsx', '.ts', '.d.ts', '.tsx'],
        },
      },
    },
  },
  globalIgnores(['**/k6-test', 'openapi-specs/*']),
  {
    files: ['**/generate-metadata.ts'],

    rules: {
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['**/*spec.ts'],

    rules: {
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['**/content-announcement/*', '**/account-webhook/*'],

    rules: {
      'no-use-before-define': 'off',
      'no-shadow': 'off',
    },
  },
]);
