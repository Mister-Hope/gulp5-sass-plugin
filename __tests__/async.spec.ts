import { basename, join } from "path";
import { SassError, gulpSass } from "../src";
import { createVinyl, normaliseEOL } from "./helpers";
import Vinyl = require("vinyl");

describe("gulp-sass -- async compile", () => {
  it("should pass file when it isNull()", (done) => {
    const stream = gulpSass.async();
    const emptyFile = {
      isNull: (): boolean => true,
    };

    stream.on("data", (data: Vinyl.BufferFile) => {
      expect(data.isNull()).toEqual(true);
      done();
    });

    stream.write(emptyFile);
  });

  it("should emit error when file isStream()", (done) => {
    const stream = gulpSass.async();
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

  it("should compile an empty sass file", (done) => {
    const sassFile = createVinyl("empty.scss");
    const stream = gulpSass.async();

    stream.on("data", (cssFile: Vinyl.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(basename(cssFile.path)).toEqual("empty.css");
      expect(normaliseEOL(cssFile.contents)).toEqual("");
      done();
    });
    stream.write(sassFile);
  });

  it("should compile a single sass file", (done) => {
    const sassFile = createVinyl("mixins.scss");
    const stream = gulpSass.async();

    stream.on("data", (cssFile: Vinyl.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");
      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      done();
    });
    stream.write(sassFile);
  });

  it("should compile multiple sass files", (done) => {
    const files = [createVinyl("mixins.scss"), createVinyl("variables.scss")];
    const stream = gulpSass.async();
    let mustSee = files.length;

    stream.on("data", (cssFile: Vinyl.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");

      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      mustSee -= 1;
      if (mustSee <= 0) done();
    });
    files.forEach((file) => {
      stream.write(file);
    });
  });

  it("should compile files with partials in another folder", (done) => {
    const sassFile = createVinyl("inheritance.scss");
    const stream = gulpSass.async();

    stream.on("data", (cssFile: Vinyl.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");

      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      done();
    });

    stream.write(sassFile);
  });

  it("should emit logError on sass error", (done) => {
    const errorFile = createVinyl("error.scss");
    const stream = gulpSass.async();

    stream.on("error", gulpSass.logError);
    stream.on("end", done);
    stream.write(errorFile);
  });

  it("should preserve the original sass error message", (done) => {
    const errorFile = createVinyl("error.scss");
    const stream = gulpSass.async();

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

  it("should compile a single sass file if the file name has been changed in the stream", (done) => {
    const sassFile = createVinyl("mixins.scss");

    // Transform file name
    sassFile.path = join(join(__dirname, "scss"), "mixin--changed.scss");

    const stream = gulpSass.async();

    stream.on("data", (cssFile: Vinyl.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(cssFile.path).toContain("mixin--changed.css");

      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      done();
    });
    stream.write(sassFile);
  });

  it("should preserve changes made in-stream to a Sass file", (done) => {
    const sassFile = createVinyl("mixins.scss");
    const stream = gulpSass.async();

    // Transform file name
    sassFile.contents = Buffer.from(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      `/* Added Dynamically */${sassFile.contents!.toString()}`
    );

    stream.on("data", (cssFile: Vinyl.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");

      expect(normaliseEOL(cssFile.contents)).toContain(
        "/* Added Dynamically */"
      );
      done();
    });
    stream.write(sassFile);
  });

  // it("should work with gulp-sourcemaps", (done) => {
  //   const sassFile = createVinyl("inheritance.scss");

  //   sassFile.sourceMap =
  //     "{" +
  //     '"version": 3,' +
  //     '"file": "scss/subdir/multilevelimport.scss",' +
  //     '"names": [],' +
  //     '"mappings": "",' +
  //     '"sources": [ "scss/subdir/multilevelimport.scss" ],' +
  //     '"sourcesContent": [ "@import ../inheritance;" ]' +
  //     "}";
  //   const stream = sass();

  //   stream.on("data", (cssFile) => {
  //     // Expected sources are relative to file.base
  //     expect(cssFile.sourceMap.sources).toEqual([
  //       "includes/_cats.scss",
  //       "includes/_dogs.sass",
  //       "inheritance.scss",
  //     ]);
  //     done();
  //   });
  //   stream.write(sassFile);
  // });

  it("should compile a single indented sass file", (done) => {
    const sassFile = createVinyl("indent.sass");
    const stream = gulpSass.async();

    stream.on("data", (cssFile: Vinyl.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");

      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      done();
    });
    stream.write(sassFile);
  });

  it("should parse files in sass and scss", (done) => {
    const files = [createVinyl("mixins.scss"), createVinyl("indent.sass")];
    const stream = gulpSass.async();
    let mustSee = files.length;

    stream.on("data", (cssFile: Vinyl.BufferFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");
      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();

      mustSee -= 1;
      if (mustSee <= 0) done();
    });

    files.forEach((file) => {
      stream.write(file);
    });
  });
});
