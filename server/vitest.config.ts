import { defineConfig } from 'vitest/config';

// The server code is plain Node — no jsdom, no React setup file.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
