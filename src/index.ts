import path from "node:path";
import { Transform } from "node:stream";
import type { TransformCallback } from "node:stream";
import { fileURLToPath } from "node:url";

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

const FILE_PROTOCOL = /^file:\/\/?/u;

export interface SassError extends Error {
  messageFormatted?: string;
  messageOriginal?: string;
  relativePath?: string;
  file?: string;
  span?: Exception["span"];
  sassMessage?: string;
  sassStack?: string;
}

export interface BufferFileWithSourceMap extends BufferFile {
  sourceMap?: {
    sourcesContent?: string[];
  };
}

type PluginErrorWithSassFields = PluginError & {
  file?: string;
  span?: Exception["span"];
};

/**
 * Decode a source URL to a real file system path
 *
 * Sass may report sources as `file:` URLs whose pathname is percent-encoded, so they must be
 * decoded before they can be compared or displayed.
 *
 * @param source The source returned by Sass
 * @returns The decoded path
 */
const decodeSourcePath = (source: string): string => {
  if (!FILE_PROTOCOL.test(source)) return source;

  try {
    return fileURLToPath(source);
  } catch {
    // Not a local file URL (e.g. a custom importer URL), decode it manually
    return decodeURIComponent(source.replace(FILE_PROTOCOL, "").replace(/^\//u, ""));
  }
};

/**
 * Convert an absolute path to a path relative to the Vinyl base directory
 *
 * @param sourcePath The absolute path
 * @param base The Vinyl base directory
 * @returns The path relative to `base`
 */
const toBaseRelative = (sourcePath: string, base: string): string => {
  const normalizedPath = sourcePath.replaceAll("\\", "/");
  const normalizedBase = base.replaceAll("\\", "/");

  if (normalizedPath === normalizedBase) return "";

  if (normalizedPath.startsWith(`${normalizedBase}/`))
    return normalizedPath.slice(normalizedBase.length + 1);

  return normalizedPath.replace(/^\//u, "");
};

/**
 * Resolve the file where a Sass error occurred
 *
 * @param error The Sass error
 * @param file The Vinyl file
 * @returns The decoded file path
 */
const resolveErrorPath = (error: SassError, file: BufferFile): string => {
  const url = error.span?.url;

  if (url) {
    try {
      return fileURLToPath(url);
    } catch {
      // The span may point to a non-file URL (data URL or custom importer URL)
    }
  }

  return error.file ?? file.path;
};

/**
 * Create plugin error from Sass error
 *
 * @param error The error thrown by Sass
 * @param file The Vinyl file
 * @returns A standard Gulp Plugin Error
 */
const createError = (error: unknown, file: BufferFile): PluginError => {
  const sassError = (error instanceof Error ? error : new Error(String(error))) as SassError;

  const filePath = resolveErrorPath(sassError, file);
  const relativePath = path.relative(process.cwd(), filePath);
  const message = `${picocolors.underline(relativePath)}\n${sassError.message}`;

  sassError.messageFormatted = message;
  sassError.messageOriginal = sassError.message;
  sassError.message = stripAnsi(message);
  sassError.relativePath = relativePath;
  sassError.file = filePath;

  const pluginError: PluginErrorWithSassFields = new PluginError(PLUGIN_NAME, sassError);

  // `PluginError` only copies own enumerable properties, so expose the
  // structured span explicitly to keep the runtime error in sync with the
  // exported `SassError` type.
  pluginError.span = sassError.span;
  pluginError.file = filePath;

  return pluginError;
};

/**
 * Create a plugin error for non-Sass errors
 *
 * @param error The thrown error
 * @returns A standard Gulp Plugin Error
 */
const createNonSassError = (error: unknown): PluginError =>
  new PluginError(PLUGIN_NAME, error instanceof Error ? error : new Error(String(error)));

/**
 * Handles returning the file to the stream
 *
 * @param file The Vinyl file
 * @param result The Sass compile result
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
    const sassMap = result.sourceMap;
    const base = path.resolve(file.cwd, file.base);

    // Transform to relative file paths as in gulp-sass 5.0.0
    sassMap.sources = sassMap.sources.map((src) => {
      const sourcePath = src.startsWith("data:")
        ? // The current file and its content are included as a
          // data:<encoded file contents> URL in the new Sass JS API.
          // Map it to the original file name (first history entry).
          file.history[0]
        : decodeSourcePath(src);

      return toBaseRelative(sourcePath, base);
    });

    // Preserve sources content provided by an earlier plugin when Sass
    // doesn't include it itself
    if (file.sourceMap?.sourcesContent && !sassMap.sourcesContent)
      sassMap.sourcesContent = file.sourceMap.sourcesContent;

    // Replace the map file with the original filename (but new extension)
    sassMap.file = replaceExtension(file.relative, ".css");

    // Apply the map
    applySourceMap(file, sassMap);
  }

  if (file.stat) {
    const now = new Date();

    file.stat.atime = now;
    file.stat.mtime = now;
    file.stat.ctime = now;
  }

  return file;
};

/**
 * Create the Sass options for a file without mutating the user's options
 *
 * @param file The Vinyl file
 * @param pluginOptions The options provided by the user
 * @returns The options used to compile the file
 */
const createOptions = (
  file: BufferFileWithSourceMap,
  pluginOptions?: StringOptions<"sync" | "async">,
): StringOptions<"sync" | "async"> => {
  const options: StringOptions<"sync" | "async"> = { ...pluginOptions };

  // Ensure `syntax` is `"indented"` if a `.sass` file
  if (path.extname(file.path) === ".sass") options.syntax = "indented";

  // Never mutate the options object provided by the user: build a fresh
  // `loadPaths` array for every file instead of unshifting in place.
  const configuredLoadPaths = pluginOptions?.loadPaths as string | string[] | undefined;
  const loadPaths =
    typeof configuredLoadPaths === "string"
      ? [configuredLoadPaths]
      : [...(configuredLoadPaths ?? [])];

  // Ensure file's parent directory in the include path
  loadPaths.unshift(path.dirname(file.path));
  options.loadPaths = loadPaths;

  // Generate Source Maps if the source-map plugin is present
  if (file.sourceMap) {
    options.sourceMap = true;
    options.sourceMapIncludeSources = pluginOptions?.sourceMapIncludeSources ?? true;
  }

  return options;
};

/**
 * Push the compiled file or report an error while handling it
 *
 * @param file The Vinyl file
 * @param result The Sass compile result
 * @param callback The transform callback
 */
const handleResult = (
  file: BufferFileWithSourceMap,
  result: CompileResult,
  callback: TransformCallback,
): void => {
  let outputFile: BufferFileWithSourceMap;

  try {
    outputFile = handleFile(file, result);
  } catch (err: unknown) {
    callback(createNonSassError(err));

    return;
  }

  callback(null, outputFile);
};

interface RenderOptions {
  callback: TransformCallback;
  content: string;
  file: BufferFileWithSourceMap;
  options: StringOptions<"sync" | "async">;
}

interface AsyncRenderOptions extends RenderOptions {
  stream: Transform;
}

/**
 * Compile a file with the synchronous Sass compiler
 *
 * @param renderOptions The render options
 */
const renderSync = ({ callback, content, file, options }: RenderOptions): void => {
  let result: CompileResult;

  // Only the compilation itself is treated as a Sass error: errors thrown by
  // `handleFile` or by stream consumers must not be reported as Sass errors.
  try {
    result = compileString(content, options);
  } catch (err: unknown) {
    callback(createError(err, file));

    return;
  }

  handleResult(file, result, callback);
};

/**
 * Compile a file with the asynchronous Sass compiler
 *
 * @param renderOptions The render options
 */
const renderAsync = ({ callback, content, file, options, stream }: AsyncRenderOptions): void => {
  void compileStringAsync(content, options).then(
    (result) => {
      let outputFile: BufferFileWithSourceMap;

      try {
        outputFile = handleFile(file, result);
      } catch (err: unknown) {
        callback(createNonSassError(err));

        return;
      }

      try {
        callback(null, outputFile);
      } catch (err: unknown) {
        // A downstream consumer (e.g. a `data` listener) threw while the file
        // was pushed. End the stream with the original error instead of
        // turning it into an unhandled rejection and hanging the task.
        stream.destroy(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err: unknown) => {
      callback(createError(err, file));
    },
  );
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
 * @returns A Transform stream
 */
const main: PrivateGulpSass = (pluginOptions, sync) =>
  new Transform({
    objectMode: true,
    transform(file: File, _encoding, callback): void {
      if (file.isNull()) {
        callback(null, file);

        return;
      }

      if (file.isStream()) {
        callback(new PluginError(PLUGIN_NAME, "Streaming not supported"));

        return;
      }

      if (!file.isBuffer()) {
        callback(new PluginError(PLUGIN_NAME, "Only Buffer files are supported"));

        return;
      }

      // skip those files that start with '_'
      if (path.basename(file.path).startsWith("_")) {
        callback();

        return;
      }

      if (file.contents.length === 0) {
        file.path = replaceExtension(file.path, ".css");

        callback(null, file);

        return;
      }

      const content = file.contents.toString();
      const options = createOptions(file, pluginOptions);

      if (sync) renderSync({ callback, content, file, options });
      else renderAsync({ callback, content, file, options, stream: this });
    },
  });

// Log errors nicely
// oxlint-disable-next-line func-style
function logError(this: Transform | undefined, error: SassError): void {
  const message = new PluginError("sass", error, {
    showProperties: false,
  }).toString();

  process.stderr.write(`${message}\n`);
  this?.emit?.("end");
}

export type SassOptions = StringOptions<"sync">;

export interface GulpSass {
  (pluginOptions?: StringOptions<"sync">): Transform;
  logError: (this: Transform, error: SassError) => void;
}

// Sync Sass render
export const sass: GulpSass = (pluginOptions?: StringOptions<"sync">) => main(pluginOptions, true);

sass.logError = logError;

export type SassAsyncOptions = StringOptions<"async">;

export interface GulpSassAsync {
  (pluginOptions?: StringOptions<"async">): Transform;
  logError: (this: Transform, error: SassError) => void;
}

// Main Gulp Sass function
export const sassAsync: GulpSassAsync = (pluginOptions?: StringOptions<"async">) =>
  main(pluginOptions, false);

sassAsync.logError = logError;
