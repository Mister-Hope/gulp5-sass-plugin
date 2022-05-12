import { statSync } from "fs";
import { join } from "path";
import { afterAll, describe, expect, it } from "vitest";

import { LegacySassError, legacy } from "../src";
import { createVinyl, normaliseEOL } from "./__fixtures__";

import autoprefixer = require("autoprefixer");
import del = require("del");
import gulp = require("gulp");
import postcss = require("gulp-postcss");
import sourcemaps = require("gulp-sourcemaps");
import File = require("vinyl");

afterAll(() => del(join(__dirname, "results")));

describe("legacy sync render", () => {
  it("should pass file when it isNull()", () =>
    new Promise((resolve) => {
      const emptyFile = {
        isNull: (): boolean => true,
      };
      const stream = legacy();

      stream.on("data", (data: File) => {
        expect(data.isNull()).toEqual(true);
        resolve();
      });
      stream.write(emptyFile);
    }));

  it("should emit error when file isStream()", () =>
    new Promise((resolve) => {
      const stream = legacy();
      const streamFile = {
        isNull: (): boolean => false,
        isStream: (): boolean => true,
      };

      stream.on("error", (err) => {
        expect(err.message).toEqual("Streaming not supported");
        resolve();
      });
      stream.write(streamFile);
    }));

  it("should compile a single sass file", () =>
    new Promise((resolve) => {
      const sassFile = createVinyl("mixins.scss");
      const stream = legacy();

      stream.on("data", (cssFile: File.BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");
        expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
        resolve();
      });
      stream.write(sassFile);
    }));

  it("should compile multiple sass files", () =>
    new Promise((resolve) => {
      const sassFiles = [
        createVinyl("mixins.scss"),
        createVinyl("variables.scss"),
      ];
      const stream = legacy();
      let mustSee = sassFiles.length;

      stream.on("data", (cssFile: File.BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");
        expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();

        mustSee -= 1;
        if (mustSee <= 0) resolve();
      });

      sassFiles.forEach((file) => stream.write(file));
    }));

  it("should compile files with partials in another folder", () =>
    new Promise((resolve) => {
      const sassFile = createVinyl("inheritance.scss");
      const stream = legacy();

      stream.on("data", (cssFile: File.BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");
        expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
        resolve();
      });
      stream.write(sassFile);
    }));

  it("should emit logError on sass error", () =>
    new Promise((resolve) => {
      const errorFile = createVinyl("error.scss");
      const stream = legacy();

      stream.on("error", legacy.logError.bind(stream));
      stream.on("end", resolve);
      stream.write(errorFile);
    }));

  it("should preserve the original sass error message", () =>
    new Promise((resolve) => {
      const errorFile = createVinyl("error.scss");
      const stream = legacy();

      stream.on("error", (err: LegacySassError) => {
        // Error must include original error message
        expect(err.messageOriginal).toContain('expected "{".');
        // Error must include relativePath property
        expect(err.messageOriginal).toContain(
          join("__tests__", "__fixtures__", "scss", "error.scss")
        );
        // Error must include line and column error occurs on
        expect(err.messageOriginal).toContain("2:20  root stylesheet");
        resolve();
      });
      stream.write(errorFile);
    }));

  it("should work with gulp-sourcemaps", () =>
    new Promise((resolve) => {
      const sassFile = createVinyl("inheritance.scss");

      sassFile.sourceMap = JSON.stringify({
        version: "3",
        file: "__fixtures__/scss/subdir/multilevelimport.scss",
        names: [],
        mappings: "",
        sources: ["__fixtures__/scss/subdir/multilevelimport.scss"],
        sourcesContent: ["@import ../inheritance;"],
      });
      const stream = legacy();

      stream.on("data", (cssFile) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(cssFile.sourceMap.sources).toEqual([
          "includes/_cats.scss",
          "includes/_dogs.sass",
          "inheritance.scss",
        ]);
        resolve();
      });
      stream.write(sassFile);
    }));

  it("should work with gulp-sourcemaps and a globbed source", () =>
    new Promise((resolve) => {
      gulp
        .src(join(__dirname, "__fixtures__/scss/globbed/**/*.scss"))
        .pipe(sourcemaps.init())
        .pipe(legacy())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(join(__dirname, "results")))
        .on("end", resolve);
    }));

  it("should work with gulp-sourcemaps and autoprefixer", () =>
    new Promise((resolve) => {
      gulp
        .src(join(__dirname, "__fixtures__/scss/globbed/**/*.scss"))
        .pipe(sourcemaps.init())
        .pipe(legacy())
        .pipe(postcss([autoprefixer()]))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(join(__dirname, "results")))
        .on("end", resolve);
    }));

  it("should work with empty files", () =>
    new Promise((resolve) => {
      gulp
        .src(join(__dirname, "__fixtures__/scss/empty.scss"))
        .pipe(legacy())
        .pipe(gulp.dest(join(__dirname, "results")))

        .on("end", () => {
          const stat = statSync(join(__dirname, "results/empty.css"));

          expect(stat.size).toEqual(0);
          resolve();
        });
    }));
});
