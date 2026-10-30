import PluginError from "plugin-error";
import type { BufferFile } from "vinyl";
import type Vinyl from "vinyl";

import type { SassError } from "../../../src/index.js";
import { collectStream } from "../helpers.js";
import type { SassPluginOptions, SassSuiteContext } from "./types.js";

/**
 * Compile files through the plugin and collect everything it emits
 *
 * @param context The Sass suite context
 * @param input The file or files to write
 * @param options The plugin options
 * @returns The emitted files
 */
export const collectOutput = (
  context: SassSuiteContext,
  input: Vinyl | Vinyl[],
  options?: SassPluginOptions,
): Promise<BufferFile[]> => collectStream(context.plugin.create(options), input);

/**
 * Compile a single file and return the emitted file
 *
 * @param context The Sass suite context
 * @param file The file to compile
 * @param options The plugin options
 * @returns The emitted file
 */
export const compileOne = async (
  context: SassSuiteContext,
  file: Vinyl,
  options?: SassPluginOptions,
): Promise<BufferFile> => {
  const outputs = await collectOutput(context, file, options);

  if (outputs.length === 0) throw new Error("Expected the plugin to emit a file");

  return outputs[0];
};

/**
 * Compile files and return the error emitted by the plugin
 *
 * @param context The Sass suite context
 * @param input The file or files to write
 * @param options The plugin options
 * @returns The emitted error
 */
export const captureError = async (
  context: SassSuiteContext,
  input: Vinyl | Vinyl[],
  options?: SassPluginOptions,
): Promise<unknown> => {
  try {
    await collectOutput(context, input, options);
  } catch (err) {
    return err;
  }

  throw new Error("Expected the plugin stream to emit an error");
};

/**
 * Compile files and assert that the plugin emits a `PluginError`
 *
 * @param context The Sass suite context
 * @param input The file or files to write
 * @param options The plugin options
 * @returns The emitted `PluginError`
 */
export const capturePluginError = async (
  context: SassSuiteContext,
  input: Vinyl | Vinyl[],
  options?: SassPluginOptions,
): Promise<PluginError & SassError> => {
  const error = await captureError(context, input, options);

  if (!(error instanceof PluginError))
    throw new Error(`Expected the plugin to emit a PluginError, got ${String(error)}`);

  return error as PluginError & SassError;
};
