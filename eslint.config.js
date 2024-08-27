/* eslint-disable import-x/no-unresolved */
import hopeConfig, { config, tsParser } from "eslint-config-mister-hope";

export default config(
  ...hopeConfig,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "coverage/**"],
  },

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        parser: tsParser,
        tsconfigDirName: import.meta.dirname,
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
      },
    },
  },
);
