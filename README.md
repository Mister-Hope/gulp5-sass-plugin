# @mr-hope/gulp-sass

<!-- markdownlint-disable no-inline-html -->

[![CodeQL](https://github.com/Mister-Hope/gulp-sass/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Mister-Hope/gulp-sass/actions/workflows/codeql-analysis.yml) [![Test and coverage](https://github.com/Mister-Hope/gulp-sass/actions/workflows/test.yml/badge.svg)](https://github.com/Mister-Hope/gulp-sass/actions/workflows/test.yml) [![codecov](https://codecov.io/gh/Mister-Hope/gulp-sass/branch/main/graph/badge.svg?token=413OUJ2PSJ)](https://codecov.io/gh/Mister-Hope/gulp-sass)

Sass plugin for gulp.

## Migrating to V3

Since sass introduce a new `compile` api in v1.45.0 (which use `Promise` instead of `callback` when async), we are upgrading to V3 to use this new API.

**So V3 requires a minimum sass version of `1.45.0`.**

Due to `sync` is faster than `async`, users should use `sync` as the first choice, we marked `async` ones with `Async` prefix in V3.

So we are providing:

- The legacy apis `legacy` and `legacyAsync` (used to be `sassSync` and `sass` ).
- New compile api `sass` and `sassAsync`
- Option types `LegacySassOptions` and `LegacySassAsyncOptions` for old apis, together with `SassAsyncOptions` and `SassOptions` for new apis.
- Function types `GulpSass`, `GulpSassAsync`, `LegacyGulpSass`, `LegacyGulpSassAsync` for `sass`, `sassAsync`, `legacy`, `legacyAsync`

## Compare

We strongly recommend you to use this plugin instead of [gulp-sass][] or [gulp-dart-sass][].

<details>
<summary><strong>Why</strong></summary>

### gulp-sass

[gulp-sass][] is still using node-sass by default, and it has been deprecated for quite a long while.

Also, node-sass will take a long time to built during installation.

### gulp-dart-sass

[gulp-dart-sass][] is just forking the above project and changed it's deps, while it:

- just remove sourcemap and pipe tests
- still remain the old deps

### @mr-hope/gulp-sass

It's a totally rewrite version in typescript. It has:

- Uses new `compile` api
- Option interface, and will provide autocomplete and validate (with IDE support like VSCode)
- Code quality test and 100% test coverage

</details>

## Install

```sh
pnpm add -D @mr-hope/gulp-sass
```

or

```sh
yarn add -D @mr-hope/gulp-sass
```

or

```sh
npm i -D @mr-hope/gulp-sass
```

## Basic Usage

You should use `sass` to synchronously transform your sass code in to css:

```js
const { dest, src, watch } = require("gulp");
const { sass } = require("@mr-hope/gulp-sass");

const build = src("./styles/**/*.scss")
  .pipe(sass().on("error", sass.logError))
  .pipe(dest("./css"));

exports.build = build;
exports.watch = watch("./styles/**/*.scss", build);
```

You can also compile asynchronously:

```js
const { dest, src, watch } = require("gulp");
const { sassAsync } = require("@mr-hope/gulp-sass");

const build = src("./styles/**/*.scss")
  .pipe(sassAsync().on("error", sassAsync.logError))
  .pipe(dest("./css"));

exports.build = build;
exports.watch = watch("./styles/**/*.scss", build);
```

### Error logging

Note that we provide a useful function called `logError` on these 2 transform functions to let you print errors gracefully.

See the demo above for usage.

<details>
<summary><strong>Performance</strong></summary>

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

</details>

## Options

You should pass in options just like you would for [Dart Sass][] `compileString` api. They will be passed along just as if you were using `sass`. We also export `SassOption` and `SassAsyncOption` interface in declaration files.

For example:

```js
exports.build = src("./styles/**/*.scss")
  .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
  .pipe(dest("./css"));
```

Or this for asynchronous code:

```js
exports.build = src("./styles/**/*.scss")
  .pipe(
    sassAsync({ outputStyle: "compressed" }).on("error", sassAsync.logError)
  )
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

## Node Support

Only [Active LTS and Current releases][1] are supported.

[1]: https://github.com/nodejs/Release#release-schedule

## Legacy APIS

### Usage

You should use `legacy` to synchronously transform your sass code in to css:

```js
const { dest, src, watch } = require("gulp");
const { legacy } = require("@mr-hope/gulp-sass");

const build = src("./styles/**/*.scss")
  .pipe(legacy().on("error", legacy.logError))
  .pipe(dest("./css"));

exports.build = build;
exports.watch = watch("./styles/**/*.scss", build);
```

You can also compile asynchronously:

```js
const { dest, src, watch } = require("gulp");
const { legacyAsync } = require("@mr-hope/gulp-sass");

const build = src("./styles/**/*.scss")
  .pipe(legacyAsync().on("error", legacyAsync.logError))
  .pipe(dest("./css"));

exports.build = build;
exports.watch = watch("./styles/**/*.scss", build);
```

### Error logging

Note that we provide a useful function called `logError` on these 2 transform functions to let you print errors gracefully.

See the demo above for usage.

<details>
<summary><strong>Performance</strong></summary>

Note that **synchronous compilation is twice as fast as asynchronous compilation** by default, due to the overhead of asynchronous callbacks. To avoid this overhead, you can use the [`fibers`](https://www.npmjs.com/package/fibers) package to call asynchronous importers from the synchronous code path. To enable this, pass the `Fiber` class to the `fiber` option:

```js
const { dest, src, watch } = require("gulp");
const { legacyAsync } = require("@mr-hope/gulp-sass");
const fiber = require("fibers");

const build = src("./styles/**/*.scss")
  .pipe(legacyAsync({ fiber }).on("error", legacyAsync.logError))
  .pipe(dest("./css"));

exports.build = build;
exports.watch = watch("./styles/**/*.scss", build);
```

</details>

### Options

You should pass in options just like you would for [Dart Sass][]. They will be passed along just as if you were using `sass`. We also export `LegacySassOption` and `LegacySassAsyncOption` interface in declaration files.

`LegacySassOption` and `LegacySassAsyncOption` is just like `LegacyOptions<'sync'>` and `LegacyOptions<'async'>` in `sass` except for the `data` and `file` options which are used by `@mr-hope/gulp-sass` internally.

For example:

```js
exports.build = src("./styles/**/*.scss")
  .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
  .pipe(dest("./css"));
```

Or this for asynchronous code:

```js
exports.build = src("./styles/**/*.scss")
  .pipe(
    sassAsync({ outputStyle: "compressed" }).on("error", sassAsync.logError)
  )
  .pipe(dest("./css"));
```

### Source Maps

`@mr-hope/gulp-sass` can be used in tandem with [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) to generate source maps for the Sass to CSS compilation. You will need to initialize [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) prior to running `@mr-hope/gulp-sass` and write the source maps after.

```js
const sourcemaps = require("gulp-sourcemaps");

exports.build = src("./styles/**/*.scss")
  .pipe(sourcemaps.init())
  .pipe(legacy({ outputStyle: "compressed" }).on("error", legacy.logError))
  .pipe(sourcemaps.write())
  .pipe(dest("./css"));
```

By default, [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) writes the source maps inline in the compiled CSS files. To write them to a separate file, specify a path relative to the `gulp.dest()` destination in the `sourcemaps.write()` function.

```js
const sourcemaps = require("gulp-sourcemaps");

exports.build = src("./styles/**/*.scss")
  .pipe(sourcemaps.init())
  .pipe(legacy({ outputStyle: "compressed" }).on("error", legacy.logError))
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
[gulp-sass]: https://www.npmjs.com/package/gulp-sass
[gulp-dart-sass]: https://www.npmjs.com/package/gulp-dart-sass
