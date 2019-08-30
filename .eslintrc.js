"use strict";

const path = require("path");

const basePath = path.resolve(__dirname, "./eslintrc.yml");

module.exports = {
  env: {
    jest: true,
    node: true,
  },
  extends: [basePath, 'prettier', 'plugin:@typescript-eslint/recommended'],
  plugins: ["fp"],
  overrides: [
    /*
     * ESlint does not recognize TS interfaces as variable declarations, so .ts files will break no-undef.
     * This override disables no-undef for .ts and .tsx files. For these files, tsc will guard us against
     * using undefined variables.
     */
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        'no-undef': 'off',
      },
    },
    {
      files: ['**/*.spec.ts'],
      rules: {
        'max-nested-callbacks': 'off',
      },
    },
    {
      files: ['**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  rules: {
    "fp/no-loops": "error",
    "no-undefined": 0, // proposal in-progress  (https://walmart.slack.com/archives/G06PNK2LF/p1561745601266700)
    "import/no-extraneous-dependencies": 0,
    // Linting is run as the first test check and can happen before build configs
    // are generated
    "import/no-unresolved": [2, { commonjs: true, ignore: ["build/*"] }],
    '@typescript-eslint/ban-ts-ignore': [0],
    '@typescript-eslint/camelcase': [
      'error',
      { allow: ['af_dp', 'af_web_dp', 'access_token'] },
    ],
    '@typescript-eslint/explicit-function-return-type': [0],
    '@typescript-eslint/no-explicit-any': [0],
    '@typescript-eslint/no-inferrable-types': [0],
    '@typescript-eslint/no-non-null-assertion': [0],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'new-cap': [
      'error',
      { capIsNewExceptions: ['Html', 'Script', 'Api', 'GET', 'PUT', 'POST'] },
    ],
    'no-unneeded-ternary': ['error'],
    strict: [0],
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      // use <root>/tsconfig.json
      typescript: {},
    },
  },
};
