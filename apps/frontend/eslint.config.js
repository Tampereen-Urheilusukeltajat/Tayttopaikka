import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright.config.js',
      'vite.config.ts',
      'vite-env.d.ts',
    ],
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
      'react-hooks': reactHooks,
    },
    rules: {
      'no-console': 'warn',
      semi: ['error', 'always'],
      '@typescript-eslint/semi': ['error', 'always'],
      'return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'never'],
      'eol-last': ['error', 'always'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'comma-dangle': 'off',
      '@typescript-eslint/comma-dangle': 'off',
      '@typescript-eslint/member-delimiter-style': 'off',
      'multiline-ternary': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowNullableObject: true,
          allowNumber: true,
          allowString: true,
          allowNullableString: true,
        },
      ],
      '@typescript-eslint/indent': 'off',
      'no-trailing-spaces': 'warn',
      'no-undef': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      ...reactHooks.configs.recommended.rules,
    },
  },
  eslintConfigPrettier,
];
