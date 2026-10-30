import type { Transform } from "node:stream";

import type { StringOptions } from "sass";

import type { SassError } from "../../../src/index.js";
import type { SassSuitePaths } from "./fixtures.js";

export type SassPluginOptions = StringOptions<"sync" | "async">;

export type SassPluginFactory = (options?: SassPluginOptions) => Transform;

export type SassLogError = (this: Transform, error: SassError) => void;

export interface SassSuitePlugin {
  create: SassPluginFactory;
  logError: SassLogError;
}

export interface SassSuiteContext {
  plugin: SassSuitePlugin;
  getPaths: () => SassSuitePaths;
}
