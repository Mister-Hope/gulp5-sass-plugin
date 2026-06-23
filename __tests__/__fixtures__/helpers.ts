import { readFileSync } from "node:fs";
import path from "node:path";

import Vinyl from "vinyl";

const __dirname = import.meta.dirname;

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

export const normalizeEOL = (str: Buffer | string): string =>
  str.toString("utf-8").replaceAll("\r\n", "\n");
