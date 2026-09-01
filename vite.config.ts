/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      // The default `generateSW` strategy runs workbox-build's SW-template
      // pipeline, which — as of this project's Babel 8 (for the React
      // Compiler preset, see babel() above) — crashes with a Babel
      // plugin/core version mismatch inside workbox-build's own bundled
      // code ("Requires Babel ^7.0.0-0, but was loaded with 8.0.1"), even
      // though workbox-build ships its own correctly-pinned nested
      // @babel/core@7.x. `injectManifest` sidesteps it entirely: our own
      // src/sw.ts is bundled through the same Vite/rolldown pipeline as the
      // rest of the app (which already handles Babel 8 fine) instead of
      // workbox-build's separate template-generation step.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Tank War',
        short_name: 'Tank War',
        description: 'Tank War - a Battle City style tank battle game built with React',
        start_url: '.',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'logo192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // Default globPatterns misses fonts/audio — without them the app
        // shell would load offline but with no font and no sound.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,mp3,ogg}'],
        // bgm.mp3/short_of_time_bgm.mp3 are ~4-4.3MB each, over workbox's
        // default 2MB per-file precache limit — without raising this they'd
        // silently get skipped from the precache and go silent offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
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
    // The `server` workspace has its own vitest project (node env, no jsdom).
    exclude: ['**/node_modules/**', '**/dist/**', 'server/**'],
  },
});
