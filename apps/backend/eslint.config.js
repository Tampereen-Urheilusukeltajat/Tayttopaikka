import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin,
    },
    rules: {
      'no-console': 'warn',
      'semi': ['error', 'always'],
      '@typescript-eslint/semi': ['error', 'always'],
      'return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'never'],
      'eol-last': ['error', 'always'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/dot-notation': 0,
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'import/first': 'error',
    },
  },
  eslintConfigPrettier,
];
