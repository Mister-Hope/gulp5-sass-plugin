import { basename, dirname, extname, relative } from "node:path";
import { Transform } from "node:stream";
import { fileURLToPath } from "node:url";

import { underline } from "picocolors";
import PluginError from "plugin-error";
import replaceExtension from "replace-ext";
import type { CompileResult, Exception, StringOptions } from "sass";
import { compileString, compileStringAsync } from "sass";
import stripAnsi from "strip-ansi";
import Vinyl from "vinyl";
import applySourceMap from "vinyl-sourcemaps-apply";

const PLUGIN_NAME = "gulp5-sass";

export interface SassError extends Exception {
  messageFormatted?: string;
  messageOriginal?: string;
  relativePath?: string;
}

// Handles returning the file to the stream
const handleFile = (
  file: Vinyl.BufferFile,
  result: CompileResult,
): Vinyl.BufferFile => {
  // Build Source Maps
  if (result.sourceMap) {
    // Transform map into JSON
    const sassMap = result.sourceMap;

    // Grab the base file name that's being worked on
    const sassFileSrc = file.relative;

    sassMap.sources = sassMap.sources.map((source) =>
      source.startsWith("data:")
        ? file.relative
        : relative(dirname(file.path), fileURLToPath(source)),
    );

    // Replace the map file with the original file name (but new extension)
    sassMap.file = replaceExtension(sassFileSrc, ".css");

    // Apply the map
    applySourceMap(file, sassMap);
  }

  file.contents = Buffer.from(result.css);
  file.path = replaceExtension(file.path, ".css");

  if (file.stat)
    file.stat.atime = file.stat.mtime = file.stat.ctime = new Date();

  return file;
};

interface PrivateGulpSass {
  (pluginOptions?: StringOptions<"sync" | "async">, sync?: boolean): Transform;
}

// Main Gulp Sass function
const main: PrivateGulpSass = (pluginOptions = {}, sync) =>
  new Transform({
    objectMode: true,
    transform(file: Vinyl, _encoding, callback): void {
      const options = { ...pluginOptions };

      if (file.isNull()) return callback(null, file);

      if (file.isStream())
        return callback(
          new PluginError(PLUGIN_NAME, "Streaming not supported"),
        );

      if (file.isBuffer()) {
        if (basename(file.path).indexOf("_") === 0) return callback();

        if (!file.contents.length) {
          file.path = replaceExtension(file.path, ".css");

          return callback(null, file);
        }

        const content = file.contents.toString();

        // Ensure `syntax` is `"indented"` if a `.sass` file
        if (extname(file.path) === ".sass") options.syntax = "indented";

        if (!options.loadPaths) options.loadPaths = [];

        // Ensure file's parent directory in the include path
        options.loadPaths.unshift(dirname(file.path));

        // Generate Source Maps if plugin source-map present
        if (file.sourceMap) options.sourceMap = true;

        // Handles error message
        const errorHandler = (error: SassError): void => {
          const filePath = error.span?.url?.pathname
            ? error.span.url.pathname
            : file.path;

          const relativePath = relative(process.cwd(), filePath);
          const message = [underline(relativePath), error.sassMessage].join(
            "\n",
          );

          error.messageFormatted = message;
          error.messageOriginal = error.message;
          error.message = stripAnsi(message);
          error.relativePath = relativePath;

          return callback(new PluginError(PLUGIN_NAME, error));
        };

        // Sync Sass render
        if (sync)
          try {
            return callback(
              null,
              handleFile(file, compileString(content, options)),
            );
          } catch (error) {
            return errorHandler(error as SassError);
          }

        // Async Sass render
        void compileStringAsync(content, options)
          .then((result) => callback(null, handleFile(file, result)))
          .catch((err: SassError) => errorHandler(err));
      }
    },
  });

// Log errors nicely
function logError(this: Transform, error: SassError): void {
  const message = new PluginError(
    "sass",
    error.messageFormatted || error.message,
  ).toString();

  process.stderr.write(`${message}\n`);
  this.emit("end");
}

export type SassOptions = StringOptions<"sync">;

export interface GulpSass {
  (pluginOptions?: StringOptions<"sync">): Transform;
  logError(error: SassError): void;
}

// Sync Sass render
export const sass: GulpSass = (pluginOptions?: StringOptions<"sync">) =>
  main(pluginOptions, true);

sass.logError = logError;

export type SassAsyncOptions = StringOptions<"async">;

export interface GulpSassAsync {
  (pluginOptions?: StringOptions<"async">, sync?: boolean): Transform;
  logError(error: SassError): void;
}

// Main Gulp Sass function
export const sassAsync: GulpSassAsync = (
  pluginOptions?: StringOptions<"async">,
) => main(pluginOptions, false);

sassAsync.logError = logError;
