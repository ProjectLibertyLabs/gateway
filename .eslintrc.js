/* eslint-env node */
module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['airbnb-base', 'plugin:import/typescript', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  ignorePatterns: ['**/k6-test'],
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  root: true,
  rules: {
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
    'import/prefer-default-export': 'off',
    indent: 'off',
    'no-unused-vars': 'off',
    'prettier/prettier': 2,
    'no-undef': 'off',
    'import/order': 'off',
    'no-await-in-loop': 'off',
    'no-useless-constructor': 'off',
    'no-empty-function': 'warn',
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
  overrides: [
    // Each service has this file, and it's only used when manually run during dev
    {
      files: ['generate-metadata.ts'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
    // Test files can bypass some rules
    {
      files: ['**/*spec.ts'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
    // Generated files
    {
      files: ['**/content-announcement/*'],
      rules: {
        'no-use-before-define': 'off',
        'no-shadow': 'off',
      },
    },
  ],
};
