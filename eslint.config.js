import tseslint from 'typescript-eslint'

// Enforces the house rules Prettier cannot express: brace omission and TS strictness.
// Prettier owns semicolons, arrow parens, quotes, and width via .prettierrc.json.
export default tseslint.config({
    files: ['src/**/*.ts', 'test/**/*.ts'],
    extends: [tseslint.configs.base],
    rules: {
        curly: ['error', 'multi'],
        'no-var': 'error',
        'prefer-const': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
    },
})
