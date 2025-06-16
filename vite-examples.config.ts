import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: 'examples/index.html',
        },
    },
    server: {
        host: '0.0.0.0',
        port: 8080,
    },
    root: 'examples',
});