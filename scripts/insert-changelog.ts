import { readFileSync, writeFileSync } from "node:fs";

const [sectionFile = "", changelogFile = "CHANGELOG.md"] = process.argv.slice(2);
const usage = "Usage: node scripts/insert-changelog.ts <section-file> [changelog-file]";

if (!sectionFile) throw new Error(usage);

const section = readFileSync(sectionFile, "utf8").trim();

if (!section)
  throw new Error(`${sectionFile} is empty, the changelog generator did not produce a release`);

const changelog = readFileSync(changelogFile, "utf8");
const insertionPoint = changelog.search(/^## \[/mu);

if (insertionPoint < 0) throw new Error(`No "## [" release heading found in ${changelogFile}`);

writeFileSync(
  changelogFile,
  `${changelog.slice(0, insertionPoint)}${section}\n\n${changelog.slice(insertionPoint)}`,
);
