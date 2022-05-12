import { basename, dirname, extname, join, relative } from "path";
import {
  LegacyException,
  LegacyStringOptions,
  LegacyResult,
  render,
  renderSync,
} from "sass";
import { Transform } from "stream";
import { PLUGIN_NAME } from "./utils";
import type { RawSourceMap } from "source-map-js";

import chalk = require("chalk");
import PluginError = require("plugin-error");
import clonedeep = require("lodash/cloneDeep");
import stripAnsi = require("strip-ansi");
import applySourceMap = require("vinyl-sourcemaps-apply");
import replaceExtension = require("replace-ext");
import Vinyl = require("vinyl");

export interface LegacySassMap extends RawSourceMap {
  sourceRoot: string;
  file: string;
}

export interface LegacySassError extends LegacyException {
  messageFormatted?: string;
  messageOriginal?: string;
  relativePath?: string;
}

// Handles returning the file to the stream
const legacyHandleFile = (
  file: Vinyl.BufferFile,
  result: LegacyResult
): Vinyl.BufferFile => {
  // Build Source Maps
  if (result.map) {
    // Transform map into JSON
    const sassMap = JSON.parse(result.map.toString()) as LegacySassMap;

    // Grab the stdout and transform it into stdin
    const sassMapFile = sassMap.file.replace(/^stdout$/, "stdin");
    // Grab the base file name that's being worked on
    const sassFileSrc = file.relative;
    // Grab the path portion of the file that's being worked on
    const sassFileSrcPath = dirname(sassFileSrc);
    let sourceFileIndex: number;

    // Prepend the path to all files in the sources array except the file that's being worked on
    if (sassFileSrcPath) sourceFileIndex = sassMap.sources.indexOf(sassMapFile);
    sassMap.sources = sassMap.sources.map((source, index) =>
      index === sourceFileIndex ? source : join(sassFileSrcPath, source)
    );

    // Remove 'stdin' from souces and replace with filenames!
    sassMap.sources = sassMap.sources.filter((src) => src && src !== "stdin");

    // Replace the map file with the original file name (but new extension)
    sassMap.file = replaceExtension(sassFileSrc, ".css");

    // Apply the map
    applySourceMap(file, sassMap);
  }

  file.contents = result.css;
  file.path = replaceExtension(file.path, ".css");

  if (file.stat)
    file.stat.atime = file.stat.mtime = file.stat.ctime = new Date();

  return file;
};

interface PrivateGulpSass {
  (
    pluginOptions?: LegacySassOptions | LegacySassAsyncOptions,
    sync?: boolean
  ): Transform;
}

// Legacy Gulp Sass function
const legacyMain: PrivateGulpSass = (pluginOptions = {}, sync) =>
  new Transform({
    objectMode: true,
    transform(file: Vinyl, _enc, callback): void {
      const options = clonedeep(pluginOptions) as LegacyStringOptions<
        "sync" | "async"
      >;

      if (file.isNull()) return callback(null, file);

      if (file.isStream())
        return callback(
          new PluginError(PLUGIN_NAME, "Streaming not supported")
        );

      if (file.isBuffer()) {
        if (basename(file.path).indexOf("_") === 0) return callback();

        if (!file.contents.length) {
          file.path = replaceExtension(file.path, ".css");

          return callback(null, file);
        }

        options.data = file.contents.toString();

        // we set the file path here so that libsass can correctly resolve import paths
        options.file = file.path;

        // Ensure `indentedSyntax` is true if a `.sass` file
        if (extname(file.path) === ".sass") options.indentedSyntax = true;

        if (!options.includePaths) options.includePaths = [];

        // Ensure file's parent directory in the include path
        options.includePaths.unshift(dirname(file.path));

        // Generate Source Maps if plugin source-map present
        if (file.sourceMap) {
          options.sourceMap = file.path;
          options.omitSourceMapUrl = true;
          options.sourceMapContents = true;
        }

        // Handles error message
        const errorHandler = (error: LegacySassError): void => {
          const filePath =
            (error.file === "stdin" ? file.path : error.file) || file.path;
          const relativePath = relative(process.cwd(), filePath);
          const message = [chalk.underline(relativePath), error.formatted].join(
            "\n"
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
            return callback(null, legacyHandleFile(file, renderSync(options)));
          } catch (error) {
            return errorHandler(error as LegacySassError);
          }

        // Async Sass render
        return render(
          options,
          (error?: LegacySassError, result?: LegacyResult) => {
            if (error) return errorHandler(error);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return callback(null, legacyHandleFile(file, result!));
          }
        );
      }
    },
  });

// Log errors nicely
function logError(this: Transform, error: LegacySassError): void {
  const message = new PluginError(
    "sass",
    error.messageFormatted || ""
  ).toString();

  process.stderr.write(`${message}\n`);
  this.emit("end");
}

export type LegacySassOptions = Omit<
  LegacyStringOptions<"sync">,
  "data" | "file"
>;

export interface LegacyGulpSass {
  (pluginOptions?: LegacySassOptions): Transform;
  logError(error: LegacySassError): void;
}

// Sync Sass render
export const legacy: LegacyGulpSass = (pluginOptions?: LegacySassOptions) =>
  legacyMain(pluginOptions, true);

legacy.logError = logError;

export type LegacySassAsyncOptions = Omit<
  LegacyStringOptions<"async">,
  "data" | "file"
>;

export interface LegacyGulpSassAsync {
  (pluginOptions?: LegacySassAsyncOptions, sync?: boolean): Transform;
  logError(error: LegacySassError): void;
}

// Main Gulp Sass function
export const legacyAsync: LegacyGulpSassAsync = (
  pluginOptions?: LegacySassAsyncOptions
) => legacyMain(pluginOptions, false);

legacyAsync.logError = logError;
