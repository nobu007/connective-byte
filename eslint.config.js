import globals from 'globals';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/',
      '**/.next/',
      '.windsurf/',
      'index.html',
      '**/coverage/**',
      '**/*.config.js',
    ],
  },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['apps/backend/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
