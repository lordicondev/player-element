import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        target: 'es2015',
        lib: {
            formats: ['es'],
            fileName: () => 'lordicon.js',
            entry: resolve(__dirname, 'src', 'release.ts'),
        },
        outDir: 'release',
        emptyOutDir: true,
    }
});