import { basename, join } from "node:path";

import type { BufferFile } from "vinyl";
import { describe, expect, it, vi } from "vitest";

import { createVinyl, normalizeEOL } from "./__fixtures__/index.js";
import type { SassError } from "../src/index.js";
import { sassAsync } from "../src/index.js";

describe("async compile", () => {
  it("should pass file when it isNull()", () =>
    new Promise<void>((resolve) => {
      const emptyFile = {
        isNull: (): boolean => true,
      };

      const stream = sassAsync();

      stream.on("data", (data: BufferFile) => {
        expect(data.isNull()).toEqual(true);
        resolve();
      });

      stream.write(emptyFile);
    }));

  it("should emit error when file isStream()", () =>
    new Promise<void>((resolve) => {
      const streamFile = {
        isNull: (): boolean => false,
        isStream: (): boolean => true,
      };
      const stream = sassAsync();

      stream.on("error", (err) => {
        expect(err.message).toEqual("Streaming not supported");
        resolve();
      });

      stream.write(streamFile);
    }));

  it("should compile an empty sass file", () =>
    new Promise<void>((resolve) => {
      const sassFile = createVinyl("empty.scss");
      const stream = sassAsync();

      stream.on("data", (cssFile: BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(basename(cssFile.path)).toEqual("empty.css");
        expect(normalizeEOL(cssFile.contents)).toEqual("");
        resolve();
      });
      stream.write(sassFile);
    }));

  it("should compile a single sass file", () =>
    new Promise<void>((resolve) => {
      const sassFile = createVinyl("mixins.scss");
      const stream = sassAsync();

      stream.on("data", (cssFile: BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");
        expect(normalizeEOL(cssFile.contents)).toMatchSnapshot();
        resolve();
      });
      stream.write(sassFile);
    }));

  it("should compile multiple sass files", () =>
    new Promise<void>((resolve) => {
      const sassFiles = [
        createVinyl("mixins.scss"),
        createVinyl("variables.scss"),
      ];
      const stream = sassAsync();
      let mustSee = sassFiles.length;

      stream.on("data", (cssFile: BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");

        expect(normalizeEOL(cssFile.contents)).toMatchSnapshot();
        mustSee -= 1;
        if (mustSee <= 0) resolve();
      });
      sassFiles.forEach((file) => stream.write(file));
    }));

  it("should compile files with partials in another folder", () =>
    new Promise<void>((resolve) => {
      const sassFile = createVinyl("inheritance.scss");
      const stream = sassAsync();

      stream.on("data", (cssFile: BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");

        expect(normalizeEOL(cssFile.contents)).toMatchSnapshot();
        resolve();
      });

      stream.write(sassFile);
    }));

  it("should emit logError on sass error", () =>
    new Promise<void>((resolve) => {
      const errorFile = createVinyl("error.scss");
      const stream = sassAsync();

      const logError = vi.fn(sassAsync.logError.bind(stream));

      stream.on("error", logError);
      stream.on("end", () => {
        expect(logError).toBeCalled();
        resolve();
      });
      stream.write(errorFile);
    }));

  it("should preserve the original sass error message", () =>
    new Promise<void>((resolve) => {
      const errorFile = createVinyl("error.scss");
      const stream = sassAsync();

      stream.on("error", (err: SassError) => {
        // Error must include original error message
        expect(err.messageOriginal).toContain('expected "{".');
        // Error must include line and column error occurs on
        expect(err.messageOriginal).toContain("2:20  root stylesheet");
        // Error must include relativePath property
        expect(err.message).toContain(
          join("__tests__", "__fixtures__", "scss", "error.scss"),
        );
        resolve();
      });
      stream.write(errorFile);
    }));

  it("should locate correct error file", () =>
    new Promise<void>((resolve) => {
      const errorFile = createVinyl("error-location.scss");
      const stream = sassAsync();

      stream.on("error", (err: SassError) => {
        // Error must include original error message
        expect(err.messageOriginal).toContain('expected "{".');
        // Error must include line and column error occurs on
        expect(err.messageOriginal).toContain("error.scss 2:20  @use");
        // Error must include relativePath property
        expect(err.message).toContain(
          join("__tests__", "__fixtures__", "scss", "error.scss"),
        );
        resolve();
      });
      stream.write(errorFile);
    }));

  it("should compile a single sass file if the file name has been changed in the stream", () =>
    new Promise<void>((resolve) => {
      const sassFile = createVinyl("mixins.scss");
      const stream = sassAsync();

      // Transform file name
      sassFile.path = join(__dirname, "__fixtures__/scss/mixin--changed.scss");

      stream.on("data", (cssFile: BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(cssFile.path).toContain("mixin--changed.css");

        expect(normalizeEOL(cssFile.contents)).toMatchSnapshot();
        resolve();
      });
      stream.write(sassFile);
    }));

  it("should preserve changes made in-stream to a Sass file", () =>
    new Promise<void>((resolve) => {
      const sassFile = createVinyl("mixins.scss");
      const stream = sassAsync();

      // Transform file name
      sassFile.contents = Buffer.from(
        `/* Added Dynamically */${(sassFile.contents as Buffer).toString()}`,
      );

      stream.on("data", (cssFile: BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");

        expect(normalizeEOL(cssFile.contents)).toContain(
          "/* Added Dynamically */",
        );
        resolve();
      });
      stream.write(sassFile);
    }));

  it("should have correct sources", () =>
    new Promise<void>((resolve) => {
      const sassFile = createVinyl("inheritance.scss");

      sassFile.sourceMap = JSON.stringify({
        version: "3",
        file: "__fixtures__/scss/subdir/multilevelimport.scss",
        names: [],
        mappings: "",
        sources: ["__fixtures__/scss/subdir/multilevelimport.scss"],
        sourcesContent: ["@import ../inheritance;"],
      });
      const stream = sassAsync();

      stream.on("data", (cssFile: BufferFile) => {
        // Expected sources are relative to file.base
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(cssFile.sourceMap.sources).toEqual([
          "includes/_cats.scss",
          "includes/_dogs.sass",
          "inheritance.scss",
        ]);

        resolve();
      });

      stream.write(sassFile);
    }));

  it("should compile a single indented sass file", () =>
    new Promise<void>((resolve) => {
      const sassFile = createVinyl("indent.sass");
      const stream = sassAsync();

      stream.on("data", (cssFile: BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");

        expect(normalizeEOL(cssFile.contents)).toMatchSnapshot();
        resolve();
      });
      stream.write(sassFile);
    }));

  it("should parse files in sass and scss", () =>
    new Promise<void>((resolve) => {
      const sassFiles = [
        createVinyl("mixins.scss"),
        createVinyl("indent.sass"),
      ];
      const stream = sassAsync();
      let mustSee = sassFiles.length;

      stream.on("data", (cssFile: BufferFile) => {
        expect(typeof cssFile.relative).toEqual("string");
        expect(typeof cssFile.path).toEqual("string");
        expect(normalizeEOL(cssFile.contents)).toMatchSnapshot();

        mustSee -= 1;
        if (mustSee <= 0) resolve();
      });

      sassFiles.forEach((file) => stream.write(file));
    }));
});
