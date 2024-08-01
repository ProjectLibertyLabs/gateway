// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jestlint from 'eslint-plugin-jest';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.spec.ts'],
    ...jestlint.configs['flat/recommended'],
  },
  {
    rules: {
      indent: 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
);