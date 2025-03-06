import { hope } from "eslint-config-mister-hope";

export default hope(
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
      },
    },
  },
  {
    files: ["__tests__/**/*.spec.ts"],
    rules: {
      "no-console": "off",
    },
  },
);
