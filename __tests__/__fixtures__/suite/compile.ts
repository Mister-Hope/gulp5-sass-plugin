import path from "node:path";

import { expect, it } from "vitest";

import { createVinyl, normalizeEOL } from "../helpers.js";
import { collectOutput, compileOne } from "./harness.js";
import type { SassSuiteContext } from "./types.js";

export const defineCompileTests = (context: SassSuiteContext): void => {
  it("should compile a single sass file", async () => {
    const output = await compileOne(context, createVinyl("mixins.scss"));

    expect(output.relative).toBe("mixins.css");
    expect(output.isBuffer()).toBe(true);
    expect(normalizeEOL(output.contents)).toMatchSnapshot();
  });

  it("should compile multiple sass files", async () => {
    const outputs = await collectOutput(context, [
      createVinyl("mixins.scss"),
      createVinyl("variables.scss"),
    ]);

    expect(outputs).toHaveLength(2);

    for (const output of outputs) expect(normalizeEOL(output.contents)).toMatchSnapshot();
  });

  it("should compile files with partials in another folder", async () => {
    const output = await compileOne(context, createVinyl("inheritance.scss"));

    expect(output.relative).toBe("inheritance.css");
    expect(normalizeEOL(output.contents)).toMatchSnapshot();
  });

  it("should compile a single sass file if the file name has been changed in the stream", async () => {
    const sassFile = createVinyl("mixins.scss");

    sassFile.path = path.join(path.dirname(sassFile.path), "mixin--changed.scss");

    const output = await compileOne(context, sassFile);

    expect(output.path).toContain("mixin--changed.css");
    expect(normalizeEOL(output.contents)).toMatchSnapshot();
  });

  it("should preserve changes made in-stream to a Sass file", async () => {
    const sassFile = createVinyl("mixins.scss");

    sassFile.contents = Buffer.from(
      `/* Added Dynamically */${(sassFile.contents as Buffer).toString()}`,
    );

    const output = await compileOne(context, sassFile);

    expect(normalizeEOL(output.contents)).toContain("/* Added Dynamically */");
    expect(output.path).toContain("mixins.css");
  });

  it("should compile a single indented sass file", async () => {
    const output = await compileOne(context, createVinyl("indent.sass"));

    expect(output.relative).toBe("indent.css");
    expect(normalizeEOL(output.contents)).toMatchSnapshot();
  });

  it("should parse files in sass and scss", async () => {
    const outputs = await collectOutput(context, [
      createVinyl("mixins.scss"),
      createVinyl("indent.sass"),
    ]);

    expect(outputs).toHaveLength(2);

    for (const output of outputs) expect(normalizeEOL(output.contents)).toMatchSnapshot();
  });

  it("should work with empty files", async () => {
    const output = await compileOne(context, createVinyl("empty.scss"));

    expect(output.isBuffer()).toBe(true);
    expect(output.contents).toHaveLength(0);
    expect(path.extname(output.path)).toBe(".css");
    expect(output.relative).toBe("empty.css");
  });

  it("should skip files starting with '_'", async () => {
    const outputs = await collectOutput(context, createVinyl("_partial.scss"));

    expect(outputs).toStrictEqual([]);
  });
};
