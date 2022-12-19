import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

const external = [
  "node:path",
  "node:stream",
  "node:url",
  "picocolors",
  "plugin-error",
  "replace-ext",
  "sass",
  "source-map-js",
  "strip-ansi",
  "vinyl",
  "vinyl-sourcemaps-apply",
];

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
    plugins: [
      esbuild({
        charset: "utf8",
        minify: true,
        target: "node14",
      }),
    ],
    external,
  },
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.d.ts",
        format: "esm",
      },
    ],
    plugins: [dts()],
    external,
  },
];
