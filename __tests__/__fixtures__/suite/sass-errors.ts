import path from "node:path";

import { expect, it } from "vitest";

import { collectStream, createVinyl, throwString } from "../helpers.js";
import { capturePluginError } from "./harness.js";
import type { SassPluginOptions, SassSuiteContext } from "./types.js";

const ERROR_FILE = path.join("__tests__", "__fixtures__", "scss", "error.scss");

export const defineSassErrorTests = (context: SassSuiteContext): void => {
  it("should emit a PluginError for invalid options instead of throwing a TypeError", async () => {
    const options = { syntax: "bogus" } as unknown as SassPluginOptions;
    const error = await capturePluginError(context, createVinyl("mixins.scss"), options);

    expect(error).not.toBeInstanceOf(TypeError);
    expect(error.plugin).toBe("gulp5-sass-plugin");
    expect(error.message).toContain('Unknown syntax "bogus"');
    expect(error.message).toContain(path.join("__tests__", "__fixtures__", "scss", "mixins.scss"));
  });

  it("should emit a PluginError when the upstream source map is broken", async () => {
    const sassFile = createVinyl("mixins.scss");

    (sassFile as unknown as { sourceMap: unknown }).sourceMap = {};

    const error = await capturePluginError(context, sassFile);

    expect(error.plugin).toBe("gulp5-sass-plugin");
    expect(error).not.toBeInstanceOf(TypeError);
    expect(error.message).toMatch(/version/u);
  });

  it("should wrap non-Sass errors thrown while handling the result", async () => {
    const reason = "non-sass error thrown while handling the compiled result";
    const sassFile = createVinyl("mixins.scss");

    Object.defineProperty(sassFile, "stat", {
      configurable: true,
      get() {
        throwString(reason);
      },
    });

    const error = await capturePluginError(context, sassFile);

    expect(error.plugin).toBe("gulp5-sass-plugin");
    expect(error.message).toContain(reason);
  });

  it("should wrap non-Error exceptions thrown by Sass", async () => {
    const reason = "non-error thrown by the sass logger";
    const options = {
      logger: {
        warn: (): void => {
          throwString(reason);
        },
      },
    } as unknown as SassPluginOptions;
    const sassFile = createVinyl(
      "mixins.scss",
      Buffer.from('@warn "warn";\n.warned { color: red; }'),
    );
    const error = await capturePluginError(context, sassFile, options);

    expect(error.plugin).toBe("gulp5-sass-plugin");
    expect(error.message).toContain(reason);
    expect(error.message).toContain("mixins.scss");
  });

  it("should surface errors thrown by a downstream data listener", async () => {
    const thrown = new Error("thrown by a downstream data listener");
    const stream = context.plugin.create();
    const error = await collectStream(stream, createVinyl("mixins.scss"), () => {
      throw thrown;
    }).catch((err: unknown) => err);

    expect(error).toBe(thrown);
  });

  it("should preserve the original sass error message", async () => {
    const error = await capturePluginError(context, createVinyl("error.scss"));

    expect(error.messageOriginal).toContain('expected "{".');
    expect(error.messageOriginal).toContain("2:20  root stylesheet");
    expect(error.message).toContain(ERROR_FILE);
    expect(error.relativePath).toBe(ERROR_FILE);
  });

  it("should locate correct error file", async () => {
    const error = await capturePluginError(context, createVinyl("error-location.scss"));

    expect(error.messageOriginal).toContain('expected "{".');
    expect(error.messageOriginal).toContain("error.scss 2:20  @use");
    expect(error.message).toContain(ERROR_FILE);
    expect(error.relativePath).toBe(ERROR_FILE);
  });
};
