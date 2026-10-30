# gulp5-sass-plugin

<!-- markdownlint-disable no-inline-html -->

[![CodeQL](https://github.com/Mister-Hope/gulp-sass/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Mister-Hope/gulp-sass/actions/workflows/codeql-analysis.yml) [![codecov](https://codecov.io/gh/Mister-Hope/gulp5-sass-plugin/graph/badge.svg?token=413OUJ2PSJ)](https://codecov.io/gh/Mister-Hope/gulp-sass)

Sass plugin for gulp5.

## Compare

We strongly recommend you to use this plugin instead of [gulp-sass][] or [gulp-dart-sass][].

<details>
<summary><strong>Why</strong></summary>

### gulp-sass

[gulp-sass][] has been using Dart Sass instead of node-sass since version 5, and gulp-sass 6 no longer bundles node-sass at all, so it is still a maintained and reasonable choice.

### gulp-dart-sass

[gulp-dart-sass][] is just forking the above project and changed it's deps, while it:

- just remove sourcemap and pipe tests
- still remain the old deps

### gulp5-sass-plugin

It's a totally rewrite version in typescript. It has:

- Uses new `compile` api
- Option interface, and will provide autocomplete and validate (with IDE support like VSCode)
- Code quality test and 100% test coverage

</details>

## Install

```sh
pnpm add -D gulp5-sass-plugin
# or
yarn add -D gulp5-sass-plugin
# or
npm i -D gulp5-sass-plugin
```

## Basic Usage

You should use `sass` to synchronously transform your sass code in to css:

```js
import { dest, src, watch } from "gulp";
import { sass } from "gulp5-sass-plugin";

export const build = () =>
  src("./styles/**/*.scss").pipe(sass().on("error", sass.logError)).pipe(dest("./css"));

export const watch = () => watch("./styles/**/*.scss", build);
```

You can also compile asynchronously:

```js
import { dest, src, watch } from "gulp";
import { sassAsync } from "gulp5-sass-plugin";

export const build = () =>
  src("./styles/**/*.scss").pipe(sassAsync().on("error", sassAsync.logError)).pipe(dest("./css"));

export const watch = () => watch("./styles/**/*.scss", build);
```

### Error logging

Note that we provide a useful function called `logError` on these 2 transform functions to let you print errors gracefully.

See the demo above for usage.

Be aware that `logError` is designed to be used as a stream `error` listener: it prints the error and ends the current stream (matching `gulp-sass`). Files that were not processed yet in the same stream are dropped, so make sure the error is fixed before re-running the task.

### Partials

Files whose basename starts with `_` are treated as Sass partials and are skipped: they are not compiled and not emitted to the output stream, matching the upstream [gulp-sass][] behavior.

<details>
<summary><strong>Sync or async?</strong></summary>

The synchronous version (`sass`) is faster for most use cases and is recommended by default, since synchronous compilation is roughly twice as fast as asynchronous compilation by default.

Use the asynchronous version (`sassAsync`) only when you need asynchronous [custom importers or custom functions](https://sass-lang.com/documentation/js-api/) — that's the only thing async compilation gives you here.

Note that there is no `fiber` option anymore. The [`fibers`](https://www.npmjs.com/package/fibers) package is not compatible with modern Node.js, and modern Dart Sass ignores a `fiber` option entirely.

</details>

## Options

You should pass in options just like you would for [Dart Sass][] `compileString` api. They will be passed along just as if you were using `sass`. We also export the `SassOptions` and `SassAsyncOptions` types in the declaration files.

For example:

```js
export const build = () =>
  src("./styles/**/*.scss")
    .pipe(sass({ style: "compressed" }).on("error", sass.logError))
    .pipe(dest("./css"));
```

Or this for asynchronous code:

```js
export const build = () =>
  src("./styles/**/*.scss")
    .pipe(sassAsync({ style: "compressed" }).on("error", sassAsync.logError))
    .pipe(dest("./css"));
```

## Source Maps

`gulp5-sass-plugin` can be used together with [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) to generate source maps for the Sass to CSS compilation. You will need to initialize [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) prior to running `gulp5-sass-plugin` and write the source maps after.

```js
const { dest, src, watch } = require("gulp");
const { sassAsync } = require("gulp5-sass-plugin");
const { init, write } = require("gulp-sourcemaps");

exports.build = () =>
  src("./styles/**/*.scss")
    .pipe(init())
    .pipe(sassAsync({ style: "compressed" }).on("error", sassAsync.logError))
    .pipe(write())
    .pipe(dest("./css"));
```

By default, [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) writes the source maps inline in the compiled CSS files. To write them to a separate file, specify a path relative to the `gulp.dest()` destination in the `sourcemaps.write()` function.

```js
const { dest, src, watch } = require("gulp");
const { sassAsync } = require("gulp5-sass-plugin");
const sourcemaps = require("gulp-sourcemaps");

exports.build = () =>
  src("./styles/**/*.scss")
    .pipe(sourcemaps.init())
    .pipe(sassAsync({ style: "compressed" }).on("error", sassAsync.logError))
    .pipe(sourcemaps.write("./maps"))
    .pipe(dest("./css"));
```

## Node Support

`gulp5-sass-plugin` requires Node.js 20.19.0 or above, matching the requirement of the `sass` (Dart Sass) dependency. Node.js 14/16/18 are not supported.

## Issues

`gulp5-sass-plugin` is a very light-weight wrapper around [Dart Sass][]. Because of this, the issue you're having likely isn't a `gulp5-sass-plugin` issue, but an issue with one those projects or with [Sass][] as a whole.

If you have a feature request/question how Sass works/concerns on how your Sass gets compiled/errors in your compiling, it's likely a Dart Sass issue and you should file your issue with one of those projects.

If you're having problems with the options you're passing in, it's likely a Dart Sass and you should file your issue with one of those projects.

We may, in the course of resolving issues, direct you to one of these other projects. If we do so, please follow up by searching that project's issue queue (both open and closed) for your problem and, if it doesn't exist, filing an issue with them.

[sass]: https://sass-lang.com
[dart sass]: https://github.com/sass/dart-sass
[gulp-sass]: https://www.npmjs.com/package/gulp-sass
[gulp-dart-sass]: https://www.npmjs.com/package/gulp-dart-sass
