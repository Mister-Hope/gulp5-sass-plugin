declare module "replace-ext" {
  function replaceExtension(filePath: string, ext: string): string;

  export = replaceExtension;
}

declare module "vinyl-sourcemaps-apply" {
  import Vinyl = require("vinyl");
  function applySourceMap(
    chunk: Vinyl.BufferFile,
    map: {
      file: string;
      sources: string[];
    }
  ): void;

  export = applySourceMap;
}
