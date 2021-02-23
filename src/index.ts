import { underline } from "chalk";
import { basename, dirname, extname, join, relative } from "path";
import { Options, SassException, render, renderSync, Result } from "sass";
import { Transform } from "stream";
import { RawSourceMap } from "source-map";
import PluginError = require("plugin-error");
import clonedeep = require("lodash/cloneDeep");
import stripAnsi = require("strip-ansi");
import applySourceMap = require("vinyl-sourcemaps-apply");
import replaceExtension = require("replace-ext");
import Vinyl = require("vinyl");

const PLUGIN_NAME = "gulp-sass";

export type SassOption = Omit<Options, "data" | "file">;

export interface SassMap extends RawSourceMap {
  sourceRoot: string;
  file: string;
}

export interface SassError extends SassException {
  messageFormatted?: string;
  messageOriginal?: string;
  relativePath?: string;
}

// Handles returning the file to the stream
const handleFile = (
  file: Vinyl.BufferFile,
  sassObj: Result
): Vinyl.BufferFile => {
  // Build Source Maps
  if (sassObj.map) {
    // Transform map into JSON
    const sassMap = JSON.parse(sassObj.map.toString()) as SassMap;
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

  file.contents = sassObj.css;
  file.path = replaceExtension(file.path, ".css");

  if (file.stat)
    file.stat.atime = file.stat.mtime = file.stat.ctime = new Date();

  return file;
};

export interface GulpSass {
  (pluginOptions?: SassOption, sync?: boolean): Transform;
  logError(error: SassError): void;
}

// Main Gulp Sass function
export const sass: GulpSass = (pluginOptions = {}, sync) =>
  new Transform({
    objectMode: true,
    transform(file: Vinyl, _enc, callback): void {
      const options = clonedeep(pluginOptions) as Options;

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
        const errorHandler = (error: SassError): void => {
          const filePath =
            (error.file === "stdin" ? file.path : error.file) || file.path;
          const relativePath = relative(process.cwd(), filePath);
          const message = [underline(relativePath), error.formatted].join("\n");

          error.messageFormatted = message;
          error.messageOriginal = error.message;
          error.message = stripAnsi(message);
          error.relativePath = relativePath;

          return callback(new PluginError(PLUGIN_NAME, error));
        };

        // Sync Sass render
        if (sync)
          try {
            return callback(null, handleFile(file, renderSync(options)));
          } catch (error) {
            return errorHandler(error);
          }
        // Async Sass render
        else
          return render(options, (error: SassError, result: Result) => {
            if (error) return errorHandler(error);

            return callback(null, handleFile(file, result));
          });
      }
    },
  });

// Log errors nicely
function logError(this: Transform, error: SassError): void {
  const message = new PluginError(
    "sass",
    error.messageFormatted || ""
  ).toString();

  process.stderr.write(`${message}\n`);
  this.emit("end");
}

sass.logError = logError;

export interface GulpSassSync {
  (pluginOptions?: SassOption): Transform;
  logError(error: SassError): void;
}

// Sync Sass render
export const sassSync: GulpSassSync = (pluginOptions?: SassOption) =>
  sass(pluginOptions, true);

sassSync.logError = logError;
