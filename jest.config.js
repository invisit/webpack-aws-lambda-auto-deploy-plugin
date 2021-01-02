const Path = require("path")
const {defaults} = require('jest-config');

const
  rootDir = Path.resolve(__dirname)

module.exports = {
  preset: 'ts-jest',
  verbose: true,
  rootDir,
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.tests/"
  ],
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  // transform: {
  //   ".+\\.(css|styl|less|sass|scss)$": "<rootDir>/node_modules/jest-css-modules-transform"
  // },
  // moduleNameMapper: {
  //   "^\\@invisit\\/([a-zA-Z0-9_-])(\\/.*)?$": "<rootDir>/../$1/src/$2"
  // },
  testMatch: [
    "**/__tests__/*.spec.ts"
  ],
  //runner: '@jest-runner/electron/main',
  testEnvironment: 'node',
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.json"
    }
  }
}
