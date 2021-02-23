# @mr-hope/gulp-sass

Sass plugin for

## Node Support

Only [Active LTS and Current releases][1] are supported.

[1]: https://github.com/nodejs/Release#release-schedule

## Install

```sh
yarn install gulp-sass --save-dev
```

## Basic Usage

Something like this will compile your Sass files:

```js
"use strict";

var gulp = require("gulp");
var sass = require("gulp-sass");

gulp.task("sass", () =>
  gulp
    .src("./sass/**/*.scss")
    .pipe(sass().on("error", sass.logError))
    .pipe(gulp.dest("./css"))
);

gulp.task("sass:watch", () => gulp.watch("./sass/**/*.scss", ["sass"]));
```

You can also compile synchronously, doing something like this:

```js
"use strict";

var gulp = require("gulp");
var sass = require("gulp-sass");

gulp.task("sass", () =>
  gulp
    .src("./sass/**/*.scss")
    .pipe(sass.sync().on("error", sass.logError))
    .pipe(gulp.dest("./css"))
);

gulp.task("sass:watch", () => gulp.watch("./sass/**/*.scss", ["sass"]));
```

Note that **synchronous compilation is twice as fast as asynchronous compilation** by default, due to the overhead of asynchronous callbacks. To avoid this overhead, you can use the [`fibers`](https://www.npmjs.com/package/fibers) package to call asynchronous importers from the synchronous code path. To enable this, pass the `Fiber` class to the `fiber` option:

```js
'use strict';

var Fiber = require('fibers');
var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('sass',  ()=>
   gulp.src('./sass/**/*.scss')
    .pipe(sass({fiber: Fiber}).on('error', sass.logError))
    .pipe(gulp.dest('./css'));
);

gulp.task('sass:watch',  ()=>
  gulp.watch('./sass/**/*.scss', ['sass']);
);
```

## Options

Pass in options just like you would for [Dart Sass][]; they will be passed along just as if you were using Node Sass. Except for the `data` option which is used by gulp-sass internally. Using the `file` option is also unsupported and results in undefined behaviour that may change without notice.

For example:

```js
gulp.task("sass", () =>
  gulp
    .src("./sass/**/*.scss")
    .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
    .pipe(gulp.dest("./css"))
);
```

Or this for synchronous code:

```js
gulp.task("sass", () =>
  gulp
    .src("./sass/**/*.scss")
    .pipe(sass.sync({ outputStyle: "compressed" }).on("error", sass.logError))
    .pipe(gulp.dest("./css"))
);
```

## Source Maps

`gulp-sass` can be used in tandem with [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) to generate source maps for the Sass to CSS compilation. You will need to initialize [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) prior to running `gulp-sass` and write the source maps after.

```js
const sourcemaps = require("gulp-sourcemaps");

gulp.task("sass", () =>
  gulp
    .src("./sass/**/*.scss")
    .pipe(sourcemaps.init())
    .pipe(sass().on("error", sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./css"))
);
```

By default, [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps) writes the source maps inline in the compiled CSS files. To write them to a separate file, specify a path relative to the `gulp.dest()` destination in the `sourcemaps.write()` function.

```js
const sourcemaps = require("gulp-sourcemaps");

gulp.task("sass", () =>
  gulp
    .src("./sass/**/*.scss")
    .pipe(sourcemaps.init())
    .pipe(sass().on("error", sass.logError))
    .pipe(sourcemaps.write("./maps"))
    .pipe(gulp.dest("./css"))
);
```

## Issues

`@mr-hope/gulp-sass` is a very light-weight wrapper around [Dart Sass][]. Because of this, the issue you're having likely isn't a `@mr-hope/gulp-sass` issue, but an issue with one those projects or with [Sass][] as a whole.

If you have a feature request/question how Sass works/concerns on how your Sass gets compiled/errors in your compiling, it's likely a Dart Sass issue and you should file your issue with one of those projects.

If you're having problems with the options you're passing in, it's likely a Dart Sass and you should file your issue with one of those projects.

We may, in the course of resolving issues, direct you to one of these other projects. If we do so, please follow up by searching that project's issue queue (both open and closed) for your problem and, if it doesn't exist, filing an issue with them.

[sass]: https://sass-lang.com
[dart sass]: https://github.com/sass/dart-sass
