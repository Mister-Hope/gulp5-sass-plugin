import { join } from "path";
import { statSync } from "fs";
import sass = require("../src");
import rimraf = require("rimraf");
import gulp = require("gulp");
// import autoprefixer = require("autoprefixer");
// import postcss = require("gulp-postcss");
// import sourcemaps = require("gulp-sourcemaps");
// import tap = require("gulp-tap");
// import globule = require("globule");
import { createVinyl, normaliseEOL } from "./helpers";

afterAll((done) => {
  rimraf(join(__dirname, "results"), done);
});

describe("gulp-sass -- sync compile", () => {
  it("should pass file when it isNull()", (done) => {
    const stream = sass.sync();
    const emptyFile = {
      isNull: () => true,
    };

    stream.on("data", (data) => {
      expect(data).toEqual(emptyFile);
      done();
    });
    stream.write(emptyFile);
  });

  it("should emit error when file isStream()", (done) => {
    const stream = sass.sync();
    const streamFile = {
      isNull: () => false,
      isStream: () => true,
    };
    stream.on("error", (err) => {
      expect(err.message).toEqual("Streaming not supported");
      done();
    });
    stream.write(streamFile);
  });

  it("should compile a single sass file", (done) => {
    const sassFile = createVinyl("mixins.scss");
    const stream = sass.sync();
    stream.on("data", (cssFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");
      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      done();
    });
    stream.write(sassFile);
  });

  it("should compile multiple sass files", (done) => {
    const files = [createVinyl("mixins.scss"), createVinyl("variables.scss")];
    const stream = sass.sync();
    let mustSee = files.length;

    stream.on("data", (cssFile) => {
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
    const stream = sass.sync();

    stream.on("data", (cssFile) => {
      expect(typeof cssFile.relative).toEqual("string");
      expect(typeof cssFile.path).toEqual("string");
      expect(normaliseEOL(cssFile.contents)).toMatchSnapshot();
      done();
    });
    stream.write(sassFile);
  });

  it("should emit logError on sass error", (done) => {
    const errorFile = createVinyl("error.scss");
    const stream = sass.sync();

    stream.on("error", sass.logError);
    stream.on("end", done);
    stream.write(errorFile);
  });

  it("should preserve the original sass error message", (done) => {
    const errorFile = createVinyl("error.scss");
    const stream = sass.sync();

    stream.on("error", (err: sass.SassError) => {
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

  // it("should work with gulp-sourcemaps", (done) => {
  //   const sassFile = createVinyl("inheritance.scss");

  //   // Expected sources are relative to file.base
  //   const expectedSources = [
  //     "inheritance.scss",
  //     "includes/_cats.scss",
  //     "includes/_dogs.sass",
  //   ];

  //   sassFile.sourceMap =
  //     "{" +
  //     '"version": 3,' +
  //     '"file": "scss/subdir/multilevelimport.scss",' +
  //     '"names": [],' +
  //     '"mappings": "",' +
  //     '"sources": [ "scss/subdir/multilevelimport.scss" ],' +
  //     '"sourcesContent": [ "@import ../inheritance;" ]' +
  //     "}";

  //   const stream = sass.sync();
  //   stream.on("data", (cssFile) => {
  //     expect(cssFile.sourceMap.sources).toEqual(expectedSources);
  //     done();
  //   });
  //   stream.write(sassFile);
  // });

  // it("should work with gulp-sourcemaps and autoprefixer", (done) => {
  //   const expectedSourcesBefore = [
  //     "inheritance.scss",
  //     "includes/_cats.scss",
  //     "includes/_dogs.sass",
  //   ];

  //   const expectedSourcesAfter = [
  //     "includes/_cats.scss",
  //     "includes/_dogs.sass",
  //     "inheritance.scss",
  //   ];

  //   gulp
  //     .src(join(__dirname, "scss", "inheritance.scss"))
  //     .pipe(sourcemaps.init())
  //     .pipe(sass.sync())
  //     .pipe(
  //       tap((file) => {
  //         should.exist(file.sourceMap);
  //         file.sourceMap.sources.should.eql(expectedSourcesBefore);
  //       })
  //     )
  //     .pipe(postcss([autoprefixer()]))
  //     .pipe(sourcemaps.write())
  //     .pipe(gulp.dest(join(__dirname, "results")))
  //     .pipe(
  //       tap((file) => {
  //         should.exist(file.sourceMap);
  //         file.sourceMap.sources.should.eql(expectedSourcesAfter);
  //       })
  //     )
  //     .on("end", done);
  // });

  // it("should work with gulp-sourcemaps and a globbed source", (done) => {
  //   const globPath = join(__dirname, "scss", "globbed");
  //   const files = globule.find(
  //     join(__dirname, "scss", "globbed", "**", "*.scss")
  //   );
  //   const filesContent = {};

  //   files.forEach((file) => {
  //     const source = path.normalize(path.relative(globPath, file));
  //     filesContent[source] = fs.readFileSync(file, "utf8");
  //   });

  //   gulp
  //     .src(join(__dirname, "scss", "globbed", "**", "*.scss"))
  //     .pipe(sourcemaps.init())
  //     .pipe(sass.sync())
  //     .pipe(
  //       tap((file) => {
  //         should.exist(file.sourceMap);
  //         const actual = normaliseEOL(file.sourceMap.sourcesContent[0]);
  //         const expected = normaliseEOL(
  //           filesContent[path.normalize(file.sourceMap.sources[0])]
  //         );
  //         actual.should.eql(expected);
  //       })
  //     )
  //     .on("end", done);
  // });

  // it("should work with gulp-sourcemaps and autoprefixer with different file.base", (done) => {
  //   const expectedSourcesBefore = [
  //     "scss/inheritance.scss",
  //     "scss/includes/_cats.scss",
  //     "scss/includes/_dogs.sass",
  //   ];

  //   const expectedSourcesAfter = [
  //     "scss/includes/_cats.scss",
  //     "scss/includes/_dogs.sass",
  //     "scss/inheritance.scss",
  //   ];

  //   gulp
  //     .src(join(__dirname, "scss", "inheritance.scss"), { base: "test" })
  //     .pipe(sourcemaps.init())
  //     .pipe(sass.sync())
  //     .pipe(
  //       tap((file) => {
  //         expect(file.sourceMap.sources).toEqual(expectedSourcesBefore);
  //       })
  //     )
  //     .pipe(postcss([autoprefixer()]))
  //     .pipe(
  //       tap((file) => {
  //         expect(file.sourceMap.sources).toEqual(expectedSourcesAfter);
  //       })
  //     )
  //     .on("end", done);
  // });

  it("should work with empty files", (done) => {
    gulp
      .src(join(__dirname, "scss", "empty.scss"))
      .pipe(sass.sync())
      .pipe(gulp.dest(join(__dirname, "results")))

      .on("end", () => {
        const stat = statSync(join(__dirname, "results", "empty.css"));
        expect(stat.size).toEqual(0);
        done();
      });
  });
});
