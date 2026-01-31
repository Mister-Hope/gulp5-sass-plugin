import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "./src/index.ts",
    outDir: "./dist",
    format: ["cjs", "esm"],
    target: "node14",
    dts: true,
    plugins: [
      codecovRollupPlugin({
        enableBundleAnalysis: Boolean(process.env.BUNDLE_ANALYSIS),
        bundleName: "main",
        oidc: {
          useGitHubOIDC: true,
        },
        telemetry: false,
      }),
    ],
    platform: "node",
    fixedExtension: false,
    minify: true,
    sourcemap: true,
  },
]);
