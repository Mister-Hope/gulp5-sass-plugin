const fs = require("fs");
const path = require("path");
const Vinyl = require("vinyl");

const createVinyl = (filename, contents) => {
  const base = path.join(__dirname, "scss");
  const filePath = path.join(base, filename);

  return new Vinyl({
    cwd: __dirname,
    base,
    path: filePath,
    contents: contents || fs.readFileSync(filePath),
  });
};

const normaliseEOL = (str) => str.toString("utf8").replace(/\r\n/g, "\n");

module.exports = {
  createVinyl,
  normaliseEOL,
};
