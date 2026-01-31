declare module "replace-ext" {
  function replaceExtension(filePath: string, ext: string): string;

  export = replaceExtension;
}

declare module "vinyl-sourcemaps-apply" {
  import type { RawSourceMap } from "source-map-js";
  import type Vinyl from "vinyl";

  function applySourceMap(chunk: Vinyl.BufferFile, map: RawSourceMap): void;

  export = applySourceMap;
}

// declare module "vinyl" {
//   interface File {
//     sourceMap?: {
//       sourcesContent?: string[];
//     };
//   }

//   namespace File {}
// }
