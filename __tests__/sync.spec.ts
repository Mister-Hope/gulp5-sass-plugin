import { join } from "path";
import { statSync } from "fs";
import { SassError, sassSync } from "../src";
import gulp = require("gulp");
import del = require("del");
import autoprefixer = require("autoprefixer");
import postcss = require("gulp-postcss");
import sourcemaps = require("gulp-sourcemaps");
import { createVinyl, normaliseEOL } from "./helpers";
import File = require("vinyl");

afterAll(() => del(join(__dirname, "results")));

describe("gulp-sass -- sync compile", () => {
  it("should pass file when it isNull()", (done) => {
    const emptyFile = {
      isNull: (): boolean => true,
    };
    const stream = sassSync();

    stream.on("data", (data: File) => {
      expect(data.isNull()).toEqual(true);
      done();
    });
    stream.write(emptyFile);
  });

  it("should emit error when file isStream()", (done) => {
    const stream = sassSync();
    const streamFile = {
      isNull: (): boolean => false,
      isStream: (): boolean => true,
    };

    stream.on("error", (err) => {
      expect(err.message).toEqual("Streaming not supported");
      done();
    });
    stream.write(streamFile);
  });

  it("should compile a single sass file", (done) => {
    const sassFile = createVinyl("mixins.scss");
    const stream = sassSync();

    stream.on("data", (cssFile: File.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");
      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      done();
    });
    stream.write(sassFile);
  });

  it("should compile multiple sass files", (done) => {
    const sassFiles = [
      createVinyl("mixins.scss"),
      createVinyl("variables.scss"),
    ];
    const stream = sassSync();
    let mustSee = sassFiles.length;

    stream.on("data", (cssFile: File.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");
      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();

      mustSee -= 1;
      if (mustSee <= 0) done();
    });

    sassFiles.forEach((file) => stream.write(file));
  });

  it("should compile files with partials in another folder", (done) => {
    const sassFile = createVinyl("inheritance.scss");
    const stream = sassSync();

    stream.on("data", (cssFile: File.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");
      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      done();
    });
    stream.write(sassFile);
  });

  it("should emit logError on sass error", (done) => {
    const errorFile = createVinyl("error.scss");
    const stream = sassSync();

    stream.on("error", sassSync.logError.bind(stream));
    stream.on("end", done);
    stream.write(errorFile);
  });

  it("should preserve the original sass error message", (done) => {
    const errorFile = createVinyl("error.scss");
    const stream = sassSync();

    stream.on("error", (err: SassError) => {
      // Error must include original error message
      expect(err.messageOriginal).toContain('expected "{".');
      // Error must include relativePath property
      expect(err.messageOriginal).toContain(
        join("__tests__", "scss", "error.scss")
      );
      // Error must include line and column error occurs on
      expect(err.messageOriginal).toContain("2:20  root stylesheet");
      done();
    });
    stream.write(errorFile);
  });

  it("should work with gulp-sourcemaps", (done) => {
    const sassFile = createVinyl("inheritance.scss");

    sassFile.sourceMap = JSON.stringify({
      version: "3",
      file: "scss/subdir/multilevelimport.scss",
      names: [],
      mappings: "",
      sources: ["scss/subdir/multilevelimport.scss"],
      sourcesContent: ["@import ../inheritance;"],
    });
    const stream = sassSync();

    stream.on("data", (cssFile) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(cssFile.sourceMap.sources).toEqual([
        "includes/_cats.scss",
        "includes/_dogs.sass",
        "inheritance.scss",
      ]);
      done();
    });
    stream.write(sassFile);
  });

  it("should work with gulp-sourcemaps and a globbed source", (done) => {
    gulp
      .src(join(__dirname, "scss/globbed/**/*.scss"))
      .pipe(sourcemaps.init())
      .pipe(sassSync())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(join(__dirname, "results")))
      .on("end", done);
  });

  it("should work with gulp-sourcemaps and autoprefixer", (done) => {
    gulp
      .src(join(__dirname, "scss/globbed/**/*.scss"))
      .pipe(sourcemaps.init())
      .pipe(sassSync())
      .pipe(postcss([autoprefixer()]))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(join(__dirname, "results")))
      .on("end", done);
  });

  it("should work with empty files", (done) => {
    gulp
      .src(join(__dirname, "scss/empty.scss"))
      .pipe(sassSync())
      .pipe(gulp.dest(join(__dirname, "results")))

      .on("end", () => {
        const stat = statSync(join(__dirname, "results/empty.css"));

        expect(stat.size).toEqual(0);
        done();
      });
  });
});
