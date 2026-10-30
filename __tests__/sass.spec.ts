import { sass } from "../src/index.js";
import { defineSassSuite } from "./__fixtures__/suite.js";

// oxlint-disable-next-line vitest/require-hook
defineSassSuite("sync compile", {
  create: (options) => sass(options),
  logError: sass.logError,
});
