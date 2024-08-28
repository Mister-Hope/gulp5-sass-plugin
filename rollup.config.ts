import { nodeResolve } from "@rollup/plugin-node-resolve";
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
  "vinyl",
  "vinyl-sourcemaps-apply",
];

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.cjs",
        format: "cjs",
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      esbuild({
        charset: "utf8",
        minify: true,
        target: "node14",
      }),
    ],
  },
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    external: [...external, "strip-ansi"],
    plugins: [
      esbuild({
        charset: "utf8",
        minify: true,
        target: "node14",
      }),
    ],
  },
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.d.ts",
        format: "esm",
      },
    ],
    external,
    plugins: [dts()],
  },
];
