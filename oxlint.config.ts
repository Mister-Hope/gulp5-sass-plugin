import { defineHopeConfig } from "oxc-config-hope/oxlint";

export default defineHopeConfig({
  rules: {
    // we are creating a gulp plugin, which is expected to be used in node environment
    "import/no-nodejs-modules": "off",
    // we use gulp 5 callback in async transform function
    "promise/no-callback-in-promise": "off",
    // gulp 5 transform uses callback style
    "promise/prefer-await-to-callbacks": "off",
  },
});
