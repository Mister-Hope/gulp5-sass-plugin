import { describe, expect, it } from "vitest";

import { normalizeEOL } from "./__fixtures__/index.js";

describe("test helpers", () => {
  it("should normalize EOL", () => {
    expect(normalizeEOL("foo\r\nbar")).toEqual("foo\nbar");
    expect(normalizeEOL("foo\nbar")).toEqual("foo\nbar");
  });
});
