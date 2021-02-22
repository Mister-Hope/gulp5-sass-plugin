import { underline } from "chalk";
import { basename, dirname, extname, join, relative } from "path";
import { Options } from "sass";
import { EventEmitter, Transform } from "stream";
import PluginError = require("plugin-error");
import clonedeep = require("lodash/cloneDeep");
import stripAnsi = require("strip-ansi");
import applySourceMap = require("vinyl-sourcemaps-apply");
import replaceExtension = require("replace-ext");

const PLUGIN_NAME = "gulp-sass";

namespace GulpSass {
  export interface SassObject {
    css: string;
    map: any;
  }

  export interface SassError extends Error {
    messageFormatted: string;
    messageOriginal: string;
    file: string;
    formatted: string;
    relativePath: string;
  }
}

// Main Gulp Sass function
const GulpSass = (options: Options = {}, sync = true) =>
  new Transform({
    objectMode: true,
    transform(chunk, _enc, callback) {
      if (chunk.isNull()) return callback(null, chunk);

      if (chunk.isStream())
        return callback(
          new PluginError(PLUGIN_NAME, "Streaming not supported")
        );

      if (basename(chunk.path).indexOf("_") === 0) return callback();

      if (!chunk.contents.length) {
        chunk.path = replaceExtension(chunk.path, ".css");

        return callback(null, chunk);
      }

      const opts = clonedeep(options);

      opts.data = chunk.contents.toString();

      // we set the file path here so that libsass can correctly resolve import paths
      opts.file = chunk.path;

      // Ensure `indentedSyntax` is true if a `.sass` file
      if (extname(chunk.path) === ".sass") opts.indentedSyntax = true;

      // Ensure file's parent directory in the include path
      if (!opts.includePaths) opts.includePaths = [];
      else if (typeof opts.includePaths === "string")
        opts.includePaths = [opts.includePaths];

      opts.includePaths.unshift(dirname(chunk.path));

      // Generate Source Maps if plugin source-map present
      if (chunk.sourceMap) {
        opts.sourceMap = chunk.path;
        opts.omitSourceMapUrl = true;
        opts.sourceMapContents = true;
      }

      // Handles returning the file to the stream
      const filePush = (sassObj: GulpSass.SassObject) => {
        let sassMap: { file: string; sources: string[] };
        let sassMapFile;
        let sassFileSrc;
        let sassFileSrcPath: string;
        let sourceFileIndex: number;

        // Build Source Maps
        if (sassObj.map) {
          // Transform map into JSON
          sassMap = JSON.parse(sassObj.map.toString());
          // Grab the stdout and transform it into stdin
          sassMapFile = sassMap.file.replace(/^stdout$/, "stdin");
          // Grab the base file name that's being worked on
          sassFileSrc = chunk.relative;
          // Grab the path portion of the file that's being worked on
          sassFileSrcPath = dirname(sassFileSrc);

          // Prepend the path to all files in the sources array except the file that's being worked on
          if (sassFileSrcPath)
            sourceFileIndex = sassMap.sources.indexOf(sassMapFile);
          sassMap.sources = sassMap.sources.map((source, index) =>
            index === sourceFileIndex ? source : join(sassFileSrcPath, source)
          );

          // Remove 'stdin' from souces and replace with filenames!
          sassMap.sources = sassMap.sources.filter(
            (src) => src !== "stdin" && src
          );

          // Replace the map file with the original file name (but new extension)
          sassMap.file = replaceExtension(sassFileSrc, ".css");
          // Apply the map
          applySourceMap(chunk, sassMap);
        }

        chunk.contents = sassObj.css;
        chunk.path = replaceExtension(chunk.path, ".css");

        if (chunk.stat)
          chunk.stat.atime = chunk.stat.mtime = chunk.stat.ctime = new Date();

        callback(null, chunk);
      };

      // Handles error message
      const errorHandler = (error: GulpSass.SassError) => {
        const filePath =
          (error.file === "stdin" ? chunk.path : error.file) || chunk.path;
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
          filePush(GulpSass.compiler.renderSync(opts));
        } catch (error) {
          return errorHandler(error);
        }
      // Async Sass render
      else
        GulpSass.compiler.render(
          opts,
          (error: GulpSass.SassError, obj: GulpSass.SassObject) => {
            if (error) return errorHandler(error);

            filePush(obj);
          }
        );
    },
  });

// Sync Sass render
GulpSass.sync = (options?: Options) => GulpSass(options, true);

// Log errors nicely
GulpSass.logError = function logError(error: GulpSass.SassError) {
  const message = new PluginError("sass", error.messageFormatted).toString();

  process.stderr.write(`${message}\n`);
  ((this as unknown) as EventEmitter).emit("end");
};

// Store compiler in a prop
GulpSass.compiler = require("sass");

export = GulpSass;
