import path from "node:path";
import type { Transform } from "node:stream";

import PluginError from "plugin-error";
import stripAnsi from "strip-ansi";
import { expect, it, vi } from "vitest";

import type { SassError } from "../../../src/index.js";
import { createVinyl } from "../helpers.js";
import type { SassSuiteContext } from "./types.js";

const ERROR_FILE = path.join("__tests__", "__fixtures__", "scss", "error.scss");

export const defineLogErrorTests = (context: SassSuiteContext): void => {
  it("should emit logError on sass error and end the stream", async () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stream = context.plugin.create();
    const listener = vi.fn((error: SassError) => {
      context.plugin.logError.call(stream, error);
    });

    stream.on("error", listener);

    const ended = new Promise<void>((resolve) => {
      stream.on("end", resolve);
    });

    stream.write(createVinyl("error.scss"));
    await ended;

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBeInstanceOf(PluginError);
    expect(listener.mock.calls[0][0].relativePath).toBe(ERROR_FILE);

    const output = stripAnsi(String(writeSpy.mock.calls[0][0]));

    expect(output).toContain('Error in plugin "sass"');
    expect(output).toContain(ERROR_FILE);
    expect(output).not.toContain("Details:");
  });

  it("should not throw when logError is called without a stream", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const error = {
      message: "standalone error",
      relativePath: ERROR_FILE,
    } as SassError;
    const logError = context.plugin.logError.bind(void 0 as unknown as Transform);

    expect(() => {
      logError(error);
    }).not.toThrow();

    const output = stripAnsi(String(writeSpy.mock.calls[0][0]));

    expect(output).toContain('Error in plugin "sass"');
    expect(output).toContain("standalone error");
    expect(output).not.toContain("Details:");
  });
};
