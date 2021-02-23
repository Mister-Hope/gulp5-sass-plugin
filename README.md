# @mr-hope/gulp-sass

[![CodeQL](https://github.com/Mister-Hope/gulp-sass/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Mister-Hope/gulp-sass/actions/workflows/codeql-analysis.yml) [![Test and coverage](https://github.com/Mister-Hope/gulp-sass/actions/workflows/test.yml/badge.svg)](https://github.com/Mister-Hope/gulp-sass/actions/workflows/test.yml) [![codecov](https://codecov.io/gh/Mister-Hope/gulp-sass/branch/main/graph/badge.svg?token=413OUJ2PSJ)](https://codecov.io/gh/Mister-Hope/gulp-sass)

Sass plugin for gulp.

## Node Support

Only [Active LTS and Current releases][1] are supported.

[1]: https://github.com/nodejs/Release#release-schedule

## Install

```sh
yarn add -D @mr-hope/gulp-sass
```

## Basic Usage

Something like this will compile your Sass files:

```js
const { dest, src, watch } = require("gulp");
const { sass } = require("@mr-hope/gulp-sass");

const build = src("./styles/**/*.scss")
  .pipe(sass().on("error", sass.logError))
  .pipe(dest("./css"));

exports.build = build;
exports.watch = watch("./styles/**/*.scss", build);
```

You can also compile synchronously, doing something like this:

```js
const { dest, src, watch } = require("gulp");
const { sassSync } = require("@mr-hope/gulp-sass");

const build = src("./styles/**/*.scss")
  .pipe(sassSync().on("error", sassSync.logError))
  .pipe(dest("./css"));

exports.build = build;
exports.watch = watch("./styles/**/*.scss", build);
```

Note that **synchronous compilation is twice as fast as asynchronous compilation** by default, due to the overhead of asynchronous callbacks. To avoid this overhead, you can use the [`fibers`](https://www.npmjs.com/package/fibers) package to call asynchronous importers from the synchronous code path. To enable this, pass the `Fiber` class to the `fiber` option:

```js
const { dest, src, watch } = require("gulp");
const { sass } = require("@mr-hope/gulp-sass");
const fiber = require("fibers");

const build = src("./styles/**/*.scss")
  .pipe(sass({ fiber }).on("error", sass.logError))
  .pipe(dest("./css"));

exports.build = build;
exports.watch = watch("./styles/**/*.scss", build);
```

## Options

Pass in options just like you would for [Dart Sass][]; they will be passed along just as if you were using `sass`. Except for the `data` option which is used by `@mr-hope/gulp-sass` internally. Using the `file` option is also unsupported and results in undefined behaviour that may change without notice.

For example:

```js
exports.build = src("./styles/**/*.scss")
  .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
  .pipe(dest("./css"));
```

Or this for synchronous code:

```js
exports.build = src("./styles/**/*.scss")
  .pipe(sassSync({ outputStyle: "compressed" }).on("error", sassSync.logError))
  .pipe(dest("./css"));
```

## Source Maps

`@mr-hope/gulp-sass` can be used in tandem with [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) to generate source maps for the Sass to CSS compilation. You will need to initialize [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) prior to running `@mr-hope/gulp-sass` and write the source maps after.

```js
const sourcemaps = require("gulp-sourcemaps");

exports.build = src("./styles/**/*.scss")
  .pipe(sourcemaps.init())
  .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
  .pipe(sourcemaps.write())
  .pipe(dest("./css"));
```

By default, [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) writes the source maps inline in the compiled CSS files. To write them to a separate file, specify a path relative to the `gulp.dest()` destination in the `sourcemaps.write()` function.

```js
const sourcemaps = require("gulp-sourcemaps");

exports.build = src("./styles/**/*.scss")
  .pipe(sourcemaps.init())
  .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
  .pipe(sourcemaps.write("./maps"))
  .pipe(dest("./css"));
```

## Issues

`@mr-hope/gulp-sass` is a very light-weight wrapper around [Dart Sass][]. Because of this, the issue you're having likely isn't a `@mr-hope/gulp-sass` issue, but an issue with one those projects or with [Sass][] as a whole.

If you have a feature request/question how Sass works/concerns on how your Sass gets compiled/errors in your compiling, it's likely a Dart Sass issue and you should file your issue with one of those projects.

If you're having problems with the options you're passing in, it's likely a Dart Sass and you should file your issue with one of those projects.

We may, in the course of resolving issues, direct you to one of these other projects. If we do so, please follow up by searching that project's issue queue (both open and closed) for your problem and, if it doesn't exist, filing an issue with them.

[sass]: https://sass-lang.com
[dart sass]: https://github.com/sass/dart-sass
