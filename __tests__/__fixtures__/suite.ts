import { rm } from "node:fs/promises";

import { afterAll, afterEach, beforeAll, describe, vi } from "vitest";

import { defineCompileTests } from "./suite/compile.js";
import { defineFileTypeTests } from "./suite/errors.js";
import { createSuitePaths } from "./suite/fixtures.js";
import type { SassSuitePaths } from "./suite/fixtures.js";
import { defineIntegrationTests } from "./suite/integration.js";
import { defineLogErrorTests } from "./suite/log-error.js";
import { defineOptionTests } from "./suite/options.js";
import { defineSassErrorTests } from "./suite/sass-errors.js";
import { defineSourceMapTests } from "./suite/sourcemaps.js";
import type { SassSuiteContext, SassSuitePlugin } from "./suite/types.js";

export type {
  SassLogError,
  SassPluginFactory,
  SassPluginOptions,
  SassSuiteContext,
  SassSuitePlugin,
} from "./suite/types.js";

/**
 * Define the tests shared by the sync and async plugin suites
 *
 * @param describeName The name of the `describe` block
 * @param plugin The plugin under test
 */
export const defineSassSuite = (describeName: string, plugin: SassSuitePlugin): void => {
  describe(describeName, () => {
    let paths: SassSuitePaths | undefined;

    const getPaths = (): SassSuitePaths => {
      if (!paths) throw new Error("Sass suite paths have not been initialized");
      return paths;
    };

    const context: SassSuiteContext = { getPaths, plugin };

    beforeAll(async () => {
      paths = await createSuitePaths();
    });

    afterAll(async () => {
      if (paths) await rm(paths.root, { force: true, recursive: true });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    defineCompileTests(context);
    defineFileTypeTests(context);
    defineSassErrorTests(context);
    defineLogErrorTests(context);
    defineOptionTests(context);
    defineSourceMapTests(context);
    defineIntegrationTests(context);
  });
};
