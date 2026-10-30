import PluginError from "plugin-error";
import type Vinyl from "vinyl";
import { expect, it } from "vitest";

import { collectStream, createVinyl } from "../helpers.js";
import { capturePluginError } from "./harness.js";
import type { SassSuiteContext } from "./types.js";

export const defineFileTypeTests = (context: SassSuiteContext): void => {
  it("should pass file when it isNull()", async () => {
    const nullFile = { isNull: (): boolean => true };
    const outputs = await collectStream(context.plugin.create(), nullFile as unknown as Vinyl);

    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toBe(nullFile);
  });

  it("should emit error when file isStream()", async () => {
    const streamFile = {
      isBuffer: (): boolean => false,
      isNull: (): boolean => false,
      isStream: (): boolean => true,
    };
    const error = await capturePluginError(context, streamFile as unknown as Vinyl);

    expect(error.message).toBe("Streaming not supported");
  });

  it("should emit error for objects that are not Vinyl buffer files", async () => {
    const duckFile = {
      isBuffer: (): boolean => false,
      isNull: (): boolean => false,
      isStream: (): boolean => false,
    };
    const error = await capturePluginError(context, duckFile as unknown as Vinyl);

    expect(error.plugin).toBe("gulp5-sass-plugin");
    expect(error.message).toBe("Only Buffer files are supported");
  });

  it("should emit only an error, without any data, for a failing file", async () => {
    const events: string[] = [];
    const stream = context.plugin.create();
    const error = await new Promise<unknown>((resolve) => {
      stream.on("data", () => {
        events.push("data");
      });
      stream.on("error", (err: unknown) => {
        events.push("error");
        resolve(err);
      });
      stream.on("end", () => {
        events.push("end");
      });
      stream.write(createVinyl("error.scss"));
    });

    expect(error).toBeInstanceOf(PluginError);
    expect(events).toStrictEqual(["error"]);
  });
};
