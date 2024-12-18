/* eslint-disable @blueprintjs/classes-constants -- we don't import blueprint here  */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  extends: [
    "airbnb-typescript",
    "plugin:@typescript-eslint/recommended",
    "plugin:eslint-comments/recommended",
    "plugin:@blueprintjs/recommended",
    "plugin:compat/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:react-hooks/recommended",
    // (thuang) disable eslint formatting rules, so prettier can do its job
    // Do not use `plugin:prettier/recommended` per doc below:
    // https://prettier.io/docs/en/integrating-with-linters.html
    "prettier",
  ],
  settings: {
    // AbortController is not supported in iOS Safari 10.3, Chrome 61
    // Headers is not supported in iOS Safari 10.3
    polyfills: ["Headers", "AbortController"],
  },
  env: { browser: true, commonjs: true, es6: true },
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
      generators: true,
    },
    // (thuang): Pairing with `tsconfigRootDir`, which points to the directory
    // of eslint.js
    project: "../../tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    "react/jsx-no-target-blank": "off",
    "eslint-comments/require-description": ["error"],
    "no-magic-numbers": "off",
    "@typescript-eslint/no-magic-numbers": "off",
    "no-nested-ternary": "off",
    "func-style": "off",
    "arrow-parens": "off",
    "no-use-before-define": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "react/jsx-filename-extension": "off",
    "comma-dangle": "off",
    "@typescript-eslint/comma-dangle": "off",
    "no-underscore-dangle": "off",
    // Override airbnb config to allow leading underscore
    // https://github.com/iamturns/eslint-config-airbnb-typescript/blob/master/lib/shared.js#L35
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "class",
        format: ["PascalCase"],
        leadingUnderscore: "allow",
      },
      {
        selector: "function",
        format: ["camelCase", "PascalCase"],
        leadingUnderscore: "allowSingleOrDouble",
      },
      {
        selector: "typeLike",
        format: ["PascalCase"],
      },
      {
        selector: "variable",
        format: ["camelCase", "PascalCase", "UPPER_CASE"],
        leadingUnderscore: "allowSingleOrDouble",
        trailingUnderscore: "allowDouble",
      },
    ],
    "implicit-arrow-linebreak": "off",
    "no-console": "off",
    "spaced-comment": ["error", "always", { exceptions: ["*"] }],
    "no-param-reassign": "off",
    "object-curly-newline": ["error", { consistent: true }],
    "react/prop-types": "off",
    "react/require-default-props": "off",
    "react/jsx-props-no-spreading": "off",
    "space-before-function-paren": "off",
    "@typescript-eslint/space-before-function-paren": "off",
    "function-paren-newline": "off",
    "prefer-destructuring": ["error", { object: true, array: false }],
    "import/prefer-default-export": "off",
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        "": "never", // https://github.com/import-js/eslint-plugin-import/issues/1573#issuecomment-565973643
        js: "never",
        jsx: "never",
        ts: "never",
        tsx: "never",
      },
    ],
    "no-restricted-syntax": [
      "error",
      "ForInStatement",
      "LabeledStatement",
      "WithStatement",
    ],
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
      },
    ],
    "@typescript-eslint/no-floating-promises": [
      "error",
      { ignoreVoid: true, ignoreIIFE: true },
    ],
  },
  overrides: [
    // Override some TypeScript rules just for .js files
    {
      files: ["*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    {
      files: ["src/components/Graph/openseadragon-scalebar.js"],
      rules: {
        "func-names": "off",
        "@typescript-eslint/no-redeclare": "off",
        "global-require": "off",
        "no-var": "off",
        "vars-on-top": "off",
        "block-scoped-var": "off",
        "@typescript-eslint/no-this-alias": "off",
        "consistent-return": "off",
        "no-restricted-properties": [
          "off",
          {
            object: "Math",
            property: "pow",
          },
        ],
      },
    },
  ],
};
/* eslint-enable @blueprintjs/classes-constants -- we don't import blueprint here  */
