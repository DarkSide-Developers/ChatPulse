module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        'plugin:security/recommended',
        'prettier'
    ],
    plugins: [
        'security'
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        'no-console': 'off',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'prefer-const': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-template': 'error',
        'template-curly-spacing': 'error',
        'arrow-spacing': 'error',
        'no-duplicate-imports': 'error',
        'no-useless-constructor': 'error',
        'no-useless-rename': 'error',
        'rest-spread-spacing': 'error',
        'prefer-destructuring': ['error', {
            array: false,
            object: true
        }],
        'security/detect-object-injection': 'off',
        'security/detect-non-literal-fs-filename': 'off'
    },
    overrides: [
        {
            files: ['examples/**/*.js'],
            rules: {
                'no-console': 'off'
            }
        }
    ]
};