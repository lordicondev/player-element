import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'));

/**
 * Two builds from one config. The default build is the npm package: ESM with
 * `@lordicon/web` left external, plus type declarations. `--mode standalone` builds
 * `dist/lordicon.js`, a self-contained module for <script type="module"> and CDNs.
 */
export default defineConfig(({ mode }) => {
    const standalone = mode === 'standalone';

    return {
        define: { __BUILD_VERSION__: JSON.stringify(version) },
        plugins: standalone
            ? []
            : [
                  dts({
                      include: ['src'],
                      exclude: ['src/**/*.test.ts', 'src/testing/**'],
                      // Declarations mirror src/ but sit at the dist root, next to index.js.
                      beforeWriteFile: (filePath, content) => ({
                          filePath: filePath.replace('/dist/src/', '/dist/'),
                          content,
                      }),
                  }),
              ],
        build: {
            target: 'es2022',
            emptyOutDir: !standalone,
            lib: {
                formats: ['es'],
                entry: resolve(
                    import.meta.dirname,
                    'src',
                    standalone ? 'standalone.ts' : 'index.ts',
                ),
                fileName: () => (standalone ? 'lordicon.js' : 'index.js'),
            },
            // Vite leaves an ES library unminified for bundlers; the CDN file is loaded as it is.
            rollupOptions: standalone
                ? { output: { minify: true } }
                : { external: ['@lordicon/web'] },
        },
    };
});
