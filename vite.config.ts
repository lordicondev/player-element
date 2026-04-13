import path, { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
            beforeWriteFile: (filePath, content) => {
                return {
                    filePath: filePath.replace(`${path.sep}dist${path.sep}src${path.sep}`, `${path.sep}dist${path.sep}`),
                    content,
                };
            },
        }),
    ],
    build: {
        target: 'es2015',
        lib: {
            formats: ['es'],
            fileName: () => 'index.js',
            entry: resolve(__dirname, 'src', 'index.ts'),
        },
        emptyOutDir: true,
        rollupOptions: {
            external: ['@lordicon/web'],
        },
    }
});