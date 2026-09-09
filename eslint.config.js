import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'server/node_modules'] },
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
      ...reactRefresh.configs.vite.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Legacy per-component setInterval+useState simulation ticks (bullet/tank/player)
      // trip this rule throughout. Structurally eliminated by the M1/M2 Engine rewrite;
      // downgraded to warn for M0 so it doesn't block a same-behavior mechanical port.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // The `server` workspace and the offline `scripts/` are plain Node — no
    // browser globals, no React, and they legitimately log to stdout.
    files: ['server/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-console': 'off',
    },
  },
);
