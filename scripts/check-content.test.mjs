import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-content.mjs", import.meta.url));

test("content gate passes in default mode (TODO text only warns)", () => {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
