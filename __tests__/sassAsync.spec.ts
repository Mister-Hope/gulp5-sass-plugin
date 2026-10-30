import path from "node:path";
import type { Transform } from "node:stream";

import PluginError from "plugin-error";
import { describe, expect, it } from "vitest";

import { sassAsync } from "../src/index.js";
import { createVinyl, throwString } from "./__fixtures__/index.js";
import { defineSassSuite } from "./__fixtures__/suite.js";

const STREAM_TIMEOUT = 2000;

interface StreamObservation {
  error?: unknown;
  events: string[];
}

/**
 * Observe a plugin stream until it closes
 *
 * @param stream The plugin stream
 * @param run The function writing the files
 * @returns The emitted error, if any, and the observed events
 */
const observeStream = (stream: Transform, run: () => void): Promise<StreamObservation> =>
  new Promise<StreamObservation>((resolve, reject) => {
    const events: string[] = [];
    let error: unknown;

    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${STREAM_TIMEOUT}ms waiting for the plugin stream`));
    }, STREAM_TIMEOUT);

    stream.on("data", (file: { relative: string }) => {
      events.push(`data:${path.basename(file.relative)}`);
    });
    stream.on("error", (err: unknown) => {
      error = err;
      events.push("error");
    });
    stream.on("end", () => {
      events.push("end");
    });
    stream.on("close", () => {
      events.push("close");
      clearTimeout(timer);
      resolve({ error, events });
    });

    run();
  });

// oxlint-disable-next-line vitest/require-hook
defineSassSuite("async compile", {
  create: (options) => sassAsync(options),
  logError: sassAsync.logError,
});

describe("async compile specific", () => {
  it("should emit error and close for invalid options instead of hanging", async () => {
    const invalidOptions = { syntax: "bogus" } as unknown as Parameters<typeof sassAsync>[0];
    const stream = sassAsync(invalidOptions);
    const { error, events } = await observeStream(stream, () => {
      stream.write(createVinyl("mixins.scss"));
    });

    expect(error).toBeInstanceOf(PluginError);
    expect((error as Error).message).toContain('Unknown syntax "bogus"');
    expect(events).toContain("error");
    expect(events).toContain("close");
    expect(events).not.toContain("data:mixins.css");
  });

  it("should surface errors thrown by a downstream data listener", async () => {
    const thrown = new Error("thrown by a downstream data listener");
    const stream = sassAsync();

    stream.on("data", () => {
      throw thrown;
    });

    const { error, events } = await observeStream(stream, () => {
      stream.write(createVinyl("mixins.scss"));
    });

    expect(error).toBe(thrown);
    expect(events).toContain("error");
    expect(events).toContain("close");
  });

  it("should wrap non-Error values thrown by a downstream data listener", async () => {
    const reason = "thrown by a downstream data listener";
    const stream = sassAsync();

    stream.on("data", () => {
      throwString(reason);
    });

    const { error, events } = await observeStream(stream, () => {
      stream.write(createVinyl("mixins.scss"));
    });

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(reason);
    expect(events).toContain("error");
  });

  it("should emit every result before ending when compiling concurrently", async () => {
    const stream = sassAsync();
    const { error, events } = await observeStream(stream, () => {
      stream.write(createVinyl("mixins.scss"));
      stream.write(createVinyl("variables.scss"));
      stream.end();
    });
    const dataEvents = events.filter((event) => event.startsWith("data:")).sort();
    const endIndex = events.indexOf("end");

    expect(error).toBeUndefined();
    expect(dataEvents).toStrictEqual(["data:mixins.css", "data:variables.css"]);
    expect(endIndex).toBeGreaterThan(-1);
    expect(events.slice(endIndex + 1)).toStrictEqual(["close"]);
  });
});
