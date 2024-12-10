import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import { dts } from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

const commonExternals = [
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

export default defineConfig([
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.cjs",
        format: "cjs",
        sourcemap: true,
      },
    ],
    external: commonExternals,
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
    external: [...commonExternals, "strip-ansi"],
    plugins: [
      esbuild({
        charset: "utf8",
        minify: true,
        target: "node14",
      }),
      codecovRollupPlugin({
        enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
        bundleName: "main",
        uploadToken: process.env.CODECOV_TOKEN,
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
    external: commonExternals,
    plugins: [dts()],
  },
]);
