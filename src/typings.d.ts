declare module "replace-ext" {
  function replaceExtension(filePath: string, ext: string): string;

  export = replaceExtension;
}

declare module "vinyl-sourcemaps-apply" {
  function applySourceMap(chunk: any, map: any): void;

  export = applySourceMap;
}
