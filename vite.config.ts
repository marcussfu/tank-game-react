/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: [
      // @mui/icons-material's per-icon deep imports (e.g. "@mui/icons-material/Settings")
      // resolve to CJS-only files with no package.json "exports" map, and Vite's
      // rolldown-based dep pre-bundler fails to unwrap their `exports.default`
      // (yields the whole CJS module object instead of the icon component, crashing
      // React with "Element type is invalid"). The package ships a proper ESM build
      // of every icon under esm/, so redirect deep imports there instead.
      { find: /^@mui\/icons-material\/(?!esm\/)(.+)$/, replacement: '@mui/icons-material/esm/$1' },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
