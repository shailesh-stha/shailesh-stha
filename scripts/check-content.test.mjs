import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-content.mjs", import.meta.url));

function run(files, extra = []) {
  const root = mkdtempSync(join(tmpdir(), "content-gate-"));
  try {
    for (const [name, text] of Object.entries(files)) {
      const path = join(root, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    }
    return spawnSync(process.execPath, [script, "--root", root, ...extra], { encoding: "utf8" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("content gate passes on the real repo in default mode (TODO text only warns)", () => {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("an email is allowed in profile.ts only", () => {
  const email = 'export const e = "someone@example.com";\n';
  assert.equal(run({ "app/content/profile.ts": email }).status, 0);
  const elsewhere = run({ "app/content/legal.ts": email });
  assert.equal(elsewhere.status, 1);
  assert.match(elsewhere.stderr, /email address outside/);
});

test("pending content and phone numbers always fail", () => {
  assert.equal(run({ "app/content/work.ts": 'disclosure: "pending"\n' }).status, 1);
  assert.equal(run({ "app/content/legal.ts": 'phone: "+49 711 1234567"\n' }).status, 1);
});

test("TODO text warns by default and fails with --strict", () => {
  const files = { "app/content/legal.ts": "// TODO: fill in\n" };
  assert.equal(run(files).status, 0);
  assert.equal(run(files, ["--strict"]).status, 1);
});
