const { resolve } = require("path");

module.exports = {
  rootDir: resolve(__dirname),
  // preset: "ts-jest",
  // preset: "ts-jest/presets/js-with-babel",
  // collectCoverage: true,
  // collectCoverageFrom: ["**/*.{ts}", "!**/node_modules/**"],
  testEnvironment: "node",
  // moduleFileExtensions: ["js", "json", "jsx", "ts", "d.ts", "tsx", "node"],
  // globals: {
  //   "ts-jest": {
  //     tsconfig: "<rootDir>/tsconfig.json",
  //   },
  // },
  // transform: {
  //   "@vuepress/client/.*.js$": "babel-jest",
  //   "\\.ts$": "ts-jest",
  // },
  // transformIgnorePatterns: [
  // "node_modules/(?!(@vuepress/client|@mr-hope/vuepress-shared)/)",
  // ],
  testMatch: ["<rootDir>/__tests__/**/*.spec.js"],
  // testMatch: ["<rootDir>/__tests__/**/*.spec.ts"],
};
