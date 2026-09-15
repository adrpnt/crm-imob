// @ts-check
import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'src/types/database.types.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactRefresh.configs.vite],
    // O eslint-plugin-react-hooks v7 ainda publica seus presets no formato eslintrc
    // (`plugins` como array), que o flat config recusa. Ligamos o plugin à mão e
    // reaproveitamos o conjunto de regras que ele recomenda.
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs['recommended-latest'].rules,
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  prettier,
])
