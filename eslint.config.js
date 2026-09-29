import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts', 'examples/**/*.ts'],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ['*.ts', '*.js'],
        languageOptions: { globals: globals.node },
    },
    {
        rules: {
            // Lottie data is open-shaped; keep `any` visible without failing the build.
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
);
