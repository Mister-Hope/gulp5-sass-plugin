import { readFileSync } from "fs";
import { join } from "path";
import Vinyl = require("vinyl");

export const createVinyl = (filename: string, contents?: Buffer): Vinyl => {
  const base = join(__dirname, "scss");
  const filePath = join(base, filename);

  return new Vinyl({
    cwd: __dirname,
    base,
    path: filePath,
    contents: contents || readFileSync(filePath),
  });
};

export const normaliseEOL = (str: Buffer | string): string =>
  str.toString("utf8").replace(/\r\n/g, "\n");
