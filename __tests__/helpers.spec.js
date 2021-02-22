const { createVinyl, normaliseEOL } = require("./helpers");

describe("test helpers", () => {
  it("should normalise EOL", () => {
    expect(normaliseEOL("foo\r\nbar")).toEqual("foo\nbar");
    expect(normaliseEOL("foo\nbar")).toEqual("foo\nbar");
  });
});
