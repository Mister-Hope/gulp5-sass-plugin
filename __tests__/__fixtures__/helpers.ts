import { readFileSync } from "node:fs";
import { join } from "node:path";

import Vinyl from "vinyl";

export const createVinyl = (filename: string, contents?: Buffer): Vinyl => {
  const base = join(__dirname, "scss");
  const filePath = join(base, filename);

  return new Vinyl({
    cwd: __dirname,
    base,
    path: filePath,
    contents: contents ?? readFileSync(filePath),
  });
};

export const normalizeEOL = (str: Buffer | string): string =>
  str.toString("utf8").replace(/\r\n/g, "\n");
