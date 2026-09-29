import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: { __BUILD_VERSION__: '"test"' },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts'],
    },
});
