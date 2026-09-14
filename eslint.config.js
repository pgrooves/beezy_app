import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * The rules below marked PORTABILITY are the ones that keep an eventual React
 * Native port cheap. They are errors, not warnings, and CI fails on them.
 * See docs/DECISIONS.md#0001.
 */
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'src/theme/tokens.css'] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  /**
   * PORTABILITY: browser globals are confined to the platform adapters.
   *
   * Anything outside src/lib/platform that reaches for `window`, `document`,
   * `navigator`, `localStorage` or IndexedDB is a capability that will not
   * exist in React Native. Add an adapter method in src/lib/platform/types.ts
   * instead of an exception here.
   */
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/platform/**', 'src/main.tsx'],
    languageOptions: {
      // Drop browser globals so referencing them is an undefined variable.
      globals: {},
    },
    rules: {
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB'].map(
          (name) => ({
            name,
            message: `${name} is browser-only. Route it through an adapter in src/lib/platform (see docs/DECISIONS.md#0001).`,
          }),
        ),
      ],
      // `no-restricted-globals` only catches the bare identifier, so reaching
      // through globalThis walks straight around it. That is not hypothetical:
      // it happened while writing the session store.
      'no-restricted-properties': [
        'error',
        ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB'].map(
          (property) => ({
            object: 'globalThis',
            property,
            message: `globalThis.${property} bypasses the platform boundary. Use an adapter in src/lib/platform (docs/DECISIONS.md#0001).`,
          }),
        ),
      ],
    },
  },

  /**
   * PORTABILITY: the logic layer stays framework-agnostic.
   *
   * src/core holds pricing, availability, validation and types. It must not
   * import React, the DOM, or anything from the view layer, so the native app
   * can consume it unchanged.
   */
  {
    files: ['src/core/**/*.ts'],
    rules: {
      // `import.meta` is a bundler construct — Vite's env, an asset base URL.
      // None of it exists in React Native, so the portable layer must not
      // reach for it. Asset paths are stored relative and resolved by
      // src/lib/assets.ts in the view layer.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MetaProperty[meta.name="import"]',
          message:
            'import.meta is bundler-specific. Keep src/core portable — resolve asset URLs in src/lib/assets.ts instead.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-router*', '**/components/*', '**/routes/*'],
              message:
                'src/core is the portable logic layer: no React, no DOM, no views. Invert the dependency.',
            },
          ],
        },
      ],
    },
  },

  // Node scripts run outside the browser and outside the app boundary.
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
    rules: { 'no-restricted-globals': 'off' },
  },
);
