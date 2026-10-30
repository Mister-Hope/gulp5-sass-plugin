import path from "node:path";

import { expect, it } from "vitest";

import { createVinyl, createVinylAt, normalizeEOL } from "../helpers.js";
import { collectOutput, compileOne } from "./harness.js";
import type { SassSuiteContext } from "./types.js";

const ENTRY_CONTENTS = '@use "palette";\n.entry {\n  color: palette.$accent;\n}\n';

const createEntry = (context: SassSuiteContext): ReturnType<typeof createVinylAt> =>
  createVinylAt(path.join(context.getPaths().entriesDir, "entry.scss"), ENTRY_CONTENTS);

export const defineOptionTests = (context: SassSuiteContext): void => {
  it("should pass the style option through to sass", async () => {
    const output = await compileOne(context, createVinyl("mixins.scss"), {
      style: "compressed",
    });
    const css = normalizeEOL(output.contents);

    expect(css).not.toContain("\n");
    expect(css).toContain("#data{");
    expect(css).toContain("margin-left:10px");
  });

  it("should force the indented syntax for .sass files", async () => {
    const output = await compileOne(context, createVinyl("indent.sass"), {
      syntax: "scss",
    });
    const css = normalizeEOL(output.contents);

    expect(css).toContain("body .div {");
    expect(css).toContain("color: blue;");
    expect(output.relative).toBe("indent.css");
  });

  it("should resolve imports from custom loadPaths", async () => {
    const output = await compileOne(context, createEntry(context), {
      loadPaths: [context.getPaths().sharedDir],
    });

    expect(normalizeEOL(output.contents)).toContain("color: green;");
  });

  it("should accept a string loadPaths option", async () => {
    const loadPaths = context.getPaths().sharedDir as unknown as string[];
    const output = await compileOne(context, createEntry(context), { loadPaths });

    expect(normalizeEOL(output.contents)).toContain("color: green;");
  });

  it("should support frozen loadPaths arrays", async () => {
    const paths = context.getPaths();
    const loadPaths = Object.freeze([paths.sharedDir]) as unknown as string[];
    const outputs = await collectOutput(
      context,
      [
        createVinylAt(path.join(paths.redDir, "a.scss")),
        createVinylAt(path.join(paths.blueDir, "b.scss")),
      ],
      { loadPaths },
    );

    expect(outputs).toHaveLength(2);
    expect(normalizeEOL(outputs[0].contents)).toContain("color: red;");
    expect(normalizeEOL(outputs[1].contents)).toContain("color: blue;");
  });

  it("should not mutate the user provided loadPaths array between files", async () => {
    const paths = context.getPaths();
    const loadPaths = [paths.sharedDir];
    const outputs = await collectOutput(
      context,
      [
        createVinylAt(path.join(paths.redDir, "a.scss")),
        createVinylAt(path.join(paths.blueDir, "b.scss")),
      ],
      { loadPaths },
    );

    expect(outputs).toHaveLength(2);
    expect(normalizeEOL(outputs[0].contents)).toContain("color: red;");
    expect(normalizeEOL(outputs[1].contents)).toContain("color: blue;");
    expect(loadPaths).toStrictEqual([paths.sharedDir]);
    expect(loadPaths).toHaveLength(1);
  });
};
