const { resolve } = require("path");

module.exports = {
  rootDir: resolve(__dirname),
  preset: "ts-jest",
  collectCoverage: true,
  collectCoverageFrom: ["**/*.ts", "!**/node_modules/**"],
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "node"],
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.project.json",
    },
  },
  testMatch: ["<rootDir>/__tests__/**/*.spec.ts"],
};
