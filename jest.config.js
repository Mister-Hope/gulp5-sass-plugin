const { resolve } = require("path");

module.exports = {
  rootDir: resolve(__dirname),
  preset: "ts-jest",
  collectCoverage: true,
  collectCoverageFrom: ["**/*.ts", "!**/node_modules/**"],
  moduleFileExtensions: ["js", "ts", "node"],
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.project.json",
    },
  },
  testEnvironment: "jest-environment-node-single-context",
  testMatch: ["<rootDir>/__tests__/**/*.spec.ts"],
};
