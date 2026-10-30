import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface SassSuitePaths {
  /** Directory containing the temp fixtures */
  fixturesDir: string;
  /** Directory receiving gulp output */
  outputDir: string;
  /** Directory with a `_vars.scss` declaring the red color */
  redDir: string;
  /** Directory without a `_vars.scss` next to `b.scss` */
  blueDir: string;
  /** Directory shared through `loadPaths`, declaring the blue `_vars.scss` */
  sharedDir: string;
  /** Entry directory used for custom `loadPaths` imports */
  entriesDir: string;
  /** Directory whose name contains spaces and Chinese characters */
  spacedDir: string;
  /** Directory containing the fixture compiled through autoprefixer */
  prefixDir: string;
  root: string;
}

const FILES: Record<string, string> = {
  "_vars.scss": "$result: red;\n",
  "a.scss": '@use "vars";\n.a {\n  color: vars.$result;\n}\n',
};

const SHARED_FILES: Record<string, string> = {
  "_palette.scss": "$accent: green;\n",
  "_vars.scss": "$result: blue;\n",
};

/**
 * Create the temporary fixture tree shared by the tests of a Sass suite
 *
 * @returns The paths of the created directories
 */
export const createSuitePaths = async (): Promise<SassSuitePaths> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gulp5-sass-plugin-"));
  const fixturesDir = path.join(root, "fixtures");
  const redDir = path.join(fixturesDir, "d1");
  const blueDir = path.join(fixturesDir, "d2");
  const sharedDir = path.join(fixturesDir, "shared");
  const entriesDir = path.join(fixturesDir, "entries");
  const spacedDir = path.join(fixturesDir, "my styles 目录");
  const prefixDir = path.join(fixturesDir, "prefix");
  const outputDir = path.join(root, "output");

  await Promise.all([
    mkdir(redDir, { recursive: true }),
    mkdir(blueDir, { recursive: true }),
    mkdir(sharedDir, { recursive: true }),
    mkdir(entriesDir, { recursive: true }),
    mkdir(spacedDir, { recursive: true }),
    mkdir(prefixDir, { recursive: true }),
    mkdir(outputDir, { recursive: true }),
  ]);

  await Promise.all([
    ...Object.entries(FILES).map(([name, contents]) =>
      writeFile(path.join(redDir, name), contents),
    ),
    writeFile(path.join(blueDir, "b.scss"), '@use "vars";\n.b {\n  color: vars.$result;\n}\n'),
    ...Object.entries(SHARED_FILES).map(([name, contents]) =>
      writeFile(path.join(sharedDir, name), contents),
    ),
    writeFile(path.join(spacedDir, "_mix.scss"), "$color: teal;\n"),
    writeFile(path.join(spacedDir, "main.scss"), '@use "mix";\n.main {\n  color: mix.$color;\n}\n'),
    writeFile(
      path.join(prefixDir, "prefix.scss"),
      ".prefix {\n  user-select: none;\n  backdrop-filter: blur(2px);\n}\n",
    ),
  ]);

  return {
    blueDir,
    entriesDir,
    fixturesDir,
    outputDir,
    prefixDir,
    redDir,
    root,
    sharedDir,
    spacedDir,
  };
};
