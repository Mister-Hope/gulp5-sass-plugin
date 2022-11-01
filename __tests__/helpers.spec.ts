import { describe, expect, it } from "vitest";
import { normalizeEOL } from "./__fixtures__";

describe("test helpers", () => {
  it("should normalise EOL", () => {
    expect(normalizeEOL("foo\r\nbar")).toEqual("foo\nbar");
    expect(normalizeEOL("foo\nbar")).toEqual("foo\nbar");
  });
});
