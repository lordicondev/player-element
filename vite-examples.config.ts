import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname, 'examples');

/** The examples: every page in examples/, served from there. */
export default defineConfig({
    root,
    build: {
        rollupOptions: {
            input: readdirSync(root)
                .filter((file) => file.endsWith('.html'))
                .map((file) => resolve(root, file)),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 8080,
    },
});
