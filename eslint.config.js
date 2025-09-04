const { defineConfig, globalIgnores } = require('eslint/config');
const globals = require('globals');

const { fixupConfigRules, fixupPluginRules } = require('@eslint/compat');

const tsParser = require('@typescript-eslint/parser');
const _import = require('eslint-plugin-import');
const unusedImports = require('eslint-plugin-unused-imports');
const prettier = require('eslint-plugin-prettier');
const jseslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = defineConfig([
  jseslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.strict,
  {
    files: ['**/*.js', '**/*.ts'],
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

    extends: fixupConfigRules(compat.extends('plugin:import/typescript', 'prettier')),

    rules: {
      'consistent-return': 'error',
      'func-names': 'error',
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
      'import/no-extraneous-dependencies': 2,
      'import/no-relative-packages': 2,
      'import/prefer-default-export': 'off',
      indent: 'off',
      'methods-use-this': 'off',
      'no-await-in-loop': 'off',
      'no-console': 'off',
      'no-constant-condition': 'error',
      'no-empty-function': 'off',
      'no-param-reassign': 'error',
      'no-promise-executor-return': 'error',
      'no-redeclare': 'error',
      'no-restricted-exports': 'error',
      'no-shadow': 'off',
      'no-underscore-dangle': 'error',
      'no-use-before-define': 'off', // disabled for @typescript-eslint rule
      'no-useless-constructor': 'error',
      'no-undef': 'off', // turn off for @typescript-eslint rule
      'no-unused-vars': 'off', // has to be turned off for the @typescript-eslint rules to work
      'max-classes-per-file': 'off',
      // 'prefer-destructuring': 'error',
      'prettier/prettier': 2,
      // turn on:
      // import/extensions, import/no-unresolved,
      // new-cap, ,
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
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',
    },

    plugins: {
      import: fixupPluginRules(_import),
      'unused-imports': unusedImports,
      prettier,
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
]);
