import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { preparePages } from "./prepare-pages.mjs";

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "pages-"));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

test("moves the pre-rendered pages up and keeps the assets", () => {
  const dir = fixture({
    "assets/app.js": "js",
    "favicon.svg": "svg",
    "shailesh-stha/index.html": "home",
    "shailesh-stha/cv/index.html": "cv",
    "shailesh-stha/work/str-ai.data": "data",
  });
  try {
    preparePages(dir, "/shailesh-stha/");
    assert.equal(readFileSync(join(dir, "index.html"), "utf8"), "home");
    assert.equal(readFileSync(join(dir, "cv", "index.html"), "utf8"), "cv");
    assert.equal(readFileSync(join(dir, "work", "str-ai.data"), "utf8"), "data");
    assert.equal(readFileSync(join(dir, "assets", "app.js"), "utf8"), "js");
    assert.equal(existsSync(join(dir, "shailesh-stha")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("does nothing for a base of /", () => {
  const dir = fixture({ "index.html": "home" });
  try {
    assert.match(preparePages(dir, "/"), /nothing to move/);
    assert.equal(readFileSync(join(dir, "index.html"), "utf8"), "home");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails loudly when the expected folder is missing", () => {
  const dir = fixture({ "index.html": "home" });
  try {
    assert.throws(() => preparePages(dir, "/shailesh-stha/"), /expected pre-rendered pages/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
