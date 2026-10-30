import { readFile } from "node:fs/promises";
import path from "node:path";

import autoprefixer from "autoprefixer";
import { dest, src } from "gulp";
import postcss from "gulp-postcss";
import { init, write } from "gulp-sourcemaps";
import { expect, it } from "vitest";

import { parseInlineSourceMap } from "../helpers.js";
import type { SassSuiteContext } from "./types.js";

const __dirname = import.meta.dirname;

const GLOB_TIMEOUT = 10_000;

export const defineIntegrationTests = (context: SassSuiteContext): void => {
  it(
    "should work with gulp-sourcemaps and a globbed source",
    async () => {
      const outputDir = path.join(context.getPaths().outputDir, "globbed");

      await new Promise<void>((resolve, reject) => {
        src(path.join(__dirname, "../scss/globbed/**/*.scss"))
          .pipe(init())
          .pipe(context.plugin.create())
          .pipe(write())
          .pipe(dest(outputDir))
          .on("error", reject)
          .on("end", resolve);
      });

      const appCss = await readFile(path.join(outputDir, "app.css"), "utf8");
      const barCss = await readFile(path.join(outputDir, "foo/bar.css"), "utf8");
      const sourceMap = parseInlineSourceMap(appCss);

      expect(appCss).toContain("border: 1px solid red;");
      expect(barCss).toContain("color: green;");
      expect(sourceMap.file).toBe("app.css");
      expect(sourceMap.sources).toStrictEqual(["app.scss"]);
      expect(sourceMap.sourcesContent?.[0]).toContain("size: 72px;");
    },
    GLOB_TIMEOUT,
  );

  it(
    "should work with gulp-sourcemaps and autoprefixer",
    async () => {
      const paths = context.getPaths();
      const outputDir = path.join(paths.outputDir, "prefix");

      await new Promise<void>((resolve, reject) => {
        src(path.join(paths.prefixDir, "*.scss"))
          .pipe(init())
          .pipe(context.plugin.create())
          .pipe(postcss([autoprefixer()]))
          .pipe(write())
          .pipe(dest(outputDir))
          .on("error", reject)
          .on("end", resolve);
      });

      const css = await readFile(path.join(outputDir, "prefix.css"), "utf8");
      const sourceMap = parseInlineSourceMap(css);

      expect(css).toContain("-webkit-user-select: none;");
      expect(css).toContain("user-select: none;");
      expect(sourceMap.file).toBe("prefix.css");
      expect(sourceMap.sources).toContain("prefix.scss");
    },
    GLOB_TIMEOUT,
  );
};
