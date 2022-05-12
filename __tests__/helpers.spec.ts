import { describe, expect, it } from "vitest";
import { normaliseEOL } from "./__fixtures__";

describe("test helpers", () => {
  it("should normalise EOL", () => {
    expect(normaliseEOL("foo\r\nbar")).toEqual("foo\nbar");
    expect(normaliseEOL("foo\nbar")).toEqual("foo\nbar");
  });
});
