import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import { terser } from "rollup-plugin-terser";

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.js",
        format: "cjs",
        sourcemap: true,
      },
    ],
    plugins: [typescript(), terser()],
    external: [
      "path",
      "url",
      "sass",
      "stream",
      "chalk",
      "plugin-error",
      "replace-ext",
      "strip-ansi",
      "source-map-js",
      "vinyl",
      "vinyl-sourcemaps-apply",
    ],
  },
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.d.ts",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [dts()],
    external: [
      "path",
      "url",
      "sass",
      "stream",
      "chalk",
      "plugin-error",
      "replace-ext",
      "stripe-ansi",
      "source-map-js",
      "vinyl",
      "vinyl-sourcemaps-apply",
    ],
  },
];
