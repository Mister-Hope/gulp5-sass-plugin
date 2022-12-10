import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

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
