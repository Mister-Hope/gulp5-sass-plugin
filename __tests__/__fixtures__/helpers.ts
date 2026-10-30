import { readFileSync } from "node:fs";
import path from "node:path";
import type { Transform } from "node:stream";

import type { BufferFile } from "vinyl";
import Vinyl from "vinyl";

const __dirname = import.meta.dirname;

const STREAM_TIMEOUT = 2000;

const INLINE_SOURCE_MAP =
  /sourceMappingURL=data:application\/json;charset=utf8;base64,(?<data>[\w+/=]+)/u;

export interface InlineSourceMap {
  file?: string;
  sources: string[];
  sourcesContent?: string[];
}

export const createVinyl = (filename: string, contents?: Buffer): Vinyl => {
  const base = path.join(__dirname, "scss");
  const filePath = path.join(base, filename);

  return new Vinyl({
    cwd: __dirname,
    base,
    path: filePath,
    contents: contents ?? readFileSync(filePath),
  });
};

/**
 * Create a Vinyl file from a path outside the fixture directory
 *
 * @param filePath The path of the file
 * @param contents The file contents, read from disk when omitted
 * @returns The Vinyl file
 */
export const createVinylAt = (filePath: string, contents: Buffer | string | null = null): Vinyl =>
  new Vinyl({
    cwd: process.cwd(),
    base: path.dirname(filePath),
    path: filePath,
    contents:
      contents == null
        ? readFileSync(filePath)
        : Buffer.isBuffer(contents)
          ? contents
          : Buffer.from(contents),
  });

export const normalizeEOL = (str: Buffer | string): string =>
  str.toString("utf-8").replaceAll("\r\n", "\n");

/**
 * Throw a plain string, used to test that non-Error exceptions are wrapped
 *
 * @param reason The value to throw
 */
export const throwString = (reason: string): never => {
  // oxlint-disable-next-line typescript/only-throw-error
  throw reason;
};

/**
 * Write Vinyl files to a plugin stream and collect everything it emits
 *
 * The returned promise rejects when the stream emits an error or when it does not settle in time,
 * which makes hanging streams fail the test instead of timing out the whole run.
 *
 * @param stream The plugin stream
 * @param input The file or files to write
 * @param onData An optional additional `data` listener, used to simulate a downstream consumer that
 *   throws
 * @returns The emitted files
 */
export const collectStream = (
  stream: Transform,
  input: Vinyl | Vinyl[],
  onData?: (file: BufferFile) => void,
): Promise<BufferFile[]> =>
  new Promise<BufferFile[]>((resolve, reject) => {
    const inputFiles = Array.isArray(input) ? input : [input];
    const outputFiles: BufferFile[] = [];

    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${STREAM_TIMEOUT}ms waiting for the plugin stream`));
    }, STREAM_TIMEOUT);

    stream.on("data", (file: BufferFile) => {
      outputFiles.push(file);
      onData?.(file);
    });

    stream.on("error", (err: unknown) => {
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    });

    stream.on("end", () => {
      clearTimeout(timer);
      resolve(outputFiles);
    });

    try {
      for (const file of inputFiles) stream.write(file);
      stream.end();
    } catch (err) {
      clearTimeout(timer);
      stream.destroy();
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });

/**
 * Read the inline source map from compiled CSS
 *
 * @param css The compiled CSS
 * @returns The parsed source map
 */
export const parseInlineSourceMap = (css: string): InlineSourceMap => {
  const data = INLINE_SOURCE_MAP.exec(css)?.groups?.data;

  if (!data) throw new Error("Expected the compiled CSS to contain an inline source map");

  return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as InlineSourceMap;
};
