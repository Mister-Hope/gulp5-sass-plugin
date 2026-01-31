import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { Transform } from "node:stream";

import picocolors from "picocolors";
import PluginError from "plugin-error";
import replaceExtension from "replace-ext";
import type { CompileResult, Exception, StringOptions } from "sass";
import { compileString, compileStringAsync } from "sass";
import stripAnsi from "strip-ansi";
import type File from "vinyl";
import type { BufferFile } from "vinyl";
import applySourceMap from "vinyl-sourcemaps-apply";

const PLUGIN_NAME = "gulp5-sass-plugin";

export interface SassError extends Exception {
  messageFormatted?: string;
  messageOriginal?: string;
  relativePath?: string;
  file?: string;
}

export interface BufferFileWithSourceMap extends BufferFile {
  sourceMap?: {
    sourcesContent?: string[];
  };
}

/**
 * Create plugin error from Sass error
 *
 * @param error The Sass error
 * @param file The Vinyl file
 *
 * @returns A standard Gulp Plugin Error
 */
const createError = (error: SassError, file: BufferFile): PluginError => {
  const filePath = error.span.url?.pathname ?? file.path;

  const relativePath = relative(process.cwd(), filePath);
  const message = `${picocolors.underline(relativePath)}\n${error.message}`;

  error.messageFormatted = message;
  error.messageOriginal = error.message;
  error.message = stripAnsi(message);
  error.relativePath = relativePath;

  return new PluginError(PLUGIN_NAME, error);
};

/**
 * Handles returning the file to the stream
 *
 * @param file The Vinyl file
 * @param result The Sass compile result
 *
 * @returns The transformed Vinyl file
 */
const handleFile = (
  file: BufferFileWithSourceMap,
  result: CompileResult,
): BufferFileWithSourceMap => {
  file.contents = Buffer.from(result.css);
  file.path = replaceExtension(file.path, ".css");

  // Build Source Maps!
  if (result.sourceMap) {
    const proto = /^file:\/\/?/;
    const leadingSlash = /^\//;
    const sassMap = result.sourceMap;
    const base = resolve(file.cwd, file.base);

    // Convert from absolute path to relative as in gulp-sass 5.0.0
    sassMap.file ??= file.history[0].replace(base + sep, "").replace(proto, "");

    // Transform to relative file paths as in gulp-sass 5.0.0
    sassMap.sources = sassMap.sources.map((src) => {
      // file uses Windows-style path separators, source is a URL.
      const baseUri = base.replaceAll("\\", "/");

      // The current file and its content is included
      // as data:<encoded file contents> in the new Sass JS API.
      // Map it to the original file name (first history entry).
      if (src.startsWith("data:")) {
        return file.history[0]
          .replaceAll("\\", "/")
          .replace(`${baseUri}/`, "")
          .replace(proto, "")
          .replace(leadingSlash, "");
      }

      return src.replace(proto, "").replace(`${baseUri}/`, "").replace(leadingSlash, "");
    });

    // Grab the base filename that's being worked on
    const sassFileSrc = file.relative;

    // Replace the map file with the original filename (but new extension)
    sassMap.file = replaceExtension(sassFileSrc, ".css");

    // Apply the map
    applySourceMap(file, sassMap);
  }

  if (file.stat)
    // oxlint-disable-next-line no-multi-assign
    file.stat.atime = file.stat.mtime = file.stat.ctime = new Date();

  return file;
};

type PrivateGulpSass = (
  pluginOptions?: StringOptions<"sync" | "async">,
  sync?: boolean,
) => Transform;

/**
 * Main Gulp Sass function
 *
 * @param pluginOptions The Sass options
 * @param sync Whether to use synchronous compilation
 *
 * @returns A Transform stream
 */
const main: PrivateGulpSass = (pluginOptions, sync) =>
  new Transform({
    objectMode: true,
    transform(file: File, _encoding, callback): void {
      const options = { ...pluginOptions };

      if (file.isNull()) {
        callback(null, file);

        return;
      }

      if (file.isStream()) {
        callback(new PluginError(PLUGIN_NAME, "Streaming not supported"));

        return;
      }

      if (file.isBuffer()) {
        // skip those files that start with '_'
        if (basename(file.path).startsWith("_")) {
          callback();

          return;
        }

        if (file.contents.length === 0) {
          file.path = replaceExtension(file.path, ".css");

          callback(null, file);

          return;
        }

        // Ensure `syntax` is `"indented"` if a `.sass` file
        if (extname(file.path) === ".sass") options.syntax = "indented";

        options.loadPaths ??= [];

        // Ensure file's parent directory in the include path
        options.loadPaths.unshift(dirname(file.path));

        // Generate Source Maps if the source-map plugin is present
        // oxlint-disable-next-line typescript/strict-boolean-expressions
        if (file.sourceMap) {
          options.sourceMap = true;
          options.sourceMapIncludeSources = true;
        }

        const content = file.contents.toString();

        if (sync) {
          // Sync Sass compile
          try {
            callback(null, handleFile(file, compileString(content, options)));

            return;
          } catch (err: unknown) {
            callback(createError(err as SassError, file));

            return;
          }
        }

        // Async Sass render
        void compileStringAsync(content, options)
          .then((result) => {
            callback(null, handleFile(file, result));
          })
          .catch((err: unknown) => {
            callback(createError(err as SassError, file));
          });
      }
    },
  });

// Log errors nicely
// oxlint-disable-next-line func-style
function logError(this: Transform, error: SassError): void {
  const message = new PluginError("sass", error).toString();

  process.stderr.write(`${message}\n`);
  this.emit("end");
}

export type SassOptions = StringOptions<"sync">;

export interface GulpSass {
  (pluginOptions?: StringOptions<"sync">): Transform;
  logError(error: SassError): void;
}

// Sync Sass render
export const sass: GulpSass = (pluginOptions?: StringOptions<"sync">) => main(pluginOptions, true);

sass.logError = logError;

export type SassAsyncOptions = StringOptions<"async">;

export interface GulpSassAsync {
  (pluginOptions?: StringOptions<"async">, sync?: boolean): Transform;
  logError(error: SassError): void;
}

// Main Gulp Sass function
export const sassAsync: GulpSassAsync = (pluginOptions?: StringOptions<"async">) =>
  main(pluginOptions, false);

sassAsync.logError = logError;
