import path from "node:path";

import type Vinyl from "vinyl";
import type { BufferFile } from "vinyl";
import { expect, it } from "vitest";

import { createVinyl, createVinylAt } from "../helpers.js";
import { compileOne } from "./harness.js";
import type { SassPluginOptions, SassSuiteContext } from "./types.js";

interface CompiledSourceMap {
  file: string;
  sources: string[];
  sourcesContent?: string[];
}

const UPSTREAM_SOURCE_MAP = {
  file: "upstream.scss",
  mappings: "",
  names: [],
  sources: ["upstream.scss"],
  sourcesContent: ["/* upstream content */"],
  version: 3,
};

const enableSourceMap = (file: Vinyl): void => {
  file.sourceMap = JSON.stringify(UPSTREAM_SOURCE_MAP);
};

const getSourceMap = (file: BufferFile): CompiledSourceMap => {
  const { sourceMap } = file as unknown as { sourceMap?: CompiledSourceMap };

  if (!sourceMap) throw new Error("Expected the compiled file to have a source map");

  return sourceMap;
};

/**
 * Create an importer that reports a custom source map URL
 *
 * @param sourceMapUrl The URL reported for the imported file
 * @returns The Sass importer
 */
const createImporter = (sourceMapUrl: URL): SassPluginOptions["importer"] => ({
  canonicalize: (): URL => new URL("custom:styles"),
  load: (): { contents: string; sourceMapUrl: URL; syntax: "scss" } => ({
    contents: ".from-importer { color: purple; }",
    sourceMapUrl,
    syntax: "scss",
  }),
});

export const defineSourceMapTests = (context: SassSuiteContext): void => {
  it("should have correct sources", async () => {
    const sassFile = createVinyl("inheritance.scss");

    enableSourceMap(sassFile);

    const sourceMap = getSourceMap(await compileOne(context, sassFile));

    expect(sourceMap.file).toBe("inheritance.css");
    expect(sourceMap.sources).toStrictEqual([
      "includes/_cats.scss",
      "includes/_dogs.sass",
      "inheritance.scss",
    ]);
    expect(sourceMap.sourcesContent).toHaveLength(3);
    expect(sourceMap.sourcesContent?.[0]).toContain("background: pink");
  });

  it("should preserve the upstream sourcesContent when Sass omits it", async () => {
    const sassFile = createVinyl("inheritance.scss");

    sassFile.sourceMap = UPSTREAM_SOURCE_MAP;

    const sourceMap = getSourceMap(
      await compileOne(context, sassFile, { sourceMapIncludeSources: false }),
    );

    expect(sourceMap.file).toBe("inheritance.css");
    expect(sourceMap.sourcesContent).toStrictEqual(["/* upstream content */"]);
  });

  it("should decode sources in directories with spaces and non-ASCII characters", async () => {
    const paths = context.getPaths();
    const sassFile = createVinylAt(path.join(paths.spacedDir, "main.scss"));

    enableSourceMap(sassFile);

    const sourceMap = getSourceMap(await compileOne(context, sassFile));
    const serialized = JSON.stringify(sourceMap);

    expect(sourceMap.file).toBe("main.css");
    expect(sourceMap.sources).toStrictEqual(["main.scss", "_mix.scss"]);
    expect(sourceMap.sourcesContent).toHaveLength(2);
    expect(serialized).not.toContain("%20");
    expect(serialized).not.toContain("%E7");
  });

  it("should keep non-file source map sources untouched", async () => {
    const sourceMapUrl = new URL("https://example.com/styles/_importer.scss");
    const sassFile = createVinyl(
      "mixins.scss",
      Buffer.from('@use "importer";\n.custom { color: red; }'),
    );

    enableSourceMap(sassFile);

    const sourceMap = getSourceMap(
      await compileOne(context, sassFile, { importer: createImporter(sourceMapUrl) }),
    );

    expect(sourceMap.sources).toStrictEqual([
      "https://example.com/styles/_importer.scss",
      "mixins.scss",
    ]);
  });

  it("should decode file source map sources that are not local paths", async () => {
    const sourceMapUrl = new URL("file://example.com/styles/_importer.scss");
    const sassFile = createVinyl(
      "mixins.scss",
      Buffer.from('@use "importer";\n.custom { color: red; }'),
    );

    enableSourceMap(sassFile);

    const sourceMap = getSourceMap(
      await compileOne(context, sassFile, { importer: createImporter(sourceMapUrl) }),
    );

    expect(sourceMap.sources[0]).toBe("example.com/styles/_importer.scss");
  });

  it("should handle sources outside of the file base directory", async () => {
    const sassFile = createVinyl("inheritance.scss");

    enableSourceMap(sassFile);
    sassFile.base = path.join(path.dirname(sassFile.path), "includes", "_cats.scss");

    const sourceMap = getSourceMap(await compileOne(context, sassFile));

    expect(sourceMap.sources[0]).toBe("");
    expect(sourceMap.sources.slice(1).map((source: string) => path.basename(source))).toStrictEqual(
      ["_dogs.sass", "inheritance.scss"],
    );
  });
};
