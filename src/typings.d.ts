declare module "replace-ext" {
  function replaceExtension(filePath: string, ext: string): string;

  export = replaceExtension;
}

declare module "vinyl-sourcemaps-apply" {
  import type { RawSourceMap } from "source-map-js";
  import Vinyl = require("vinyl");

  function applySourceMap(chunk: Vinyl.BufferFile, map: RawSourceMap): void;

  export = applySourceMap;
}
