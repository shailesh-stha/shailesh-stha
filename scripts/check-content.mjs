// Content gate for the public repo: nothing pending, private or incomplete may be committed or deployed.
// Default: hard rules fail, TODO text only warns. `--strict` (use before deploying) also fails on TODO text.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const strict = process.argv.includes("--strict");

const HARD = [
  [/disclosure:\s*"pending"/, "pending content must not be in the public repo (keep it in _profile/)"],
  [/[\w.+-]+@[\w-]+\.[\w.]{2,}/, "email address"],
  [/\+\d[\d\s()-]{7,}/, "phone number"],
  [/Bögl|Boegl|\bKSA\b|Belgrad|STR-PDF/, "client, partner or internal tool name"],
  [/date of birth|geburtsdatum/i, "personal data"],
];
const SOFT = [[/TODO/, "TODO text"]];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(join(root, "app")).filter((file) => /\.(ts|tsx)$/.test(file));
let failures = 0;
let warnings = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const [pattern, message] of HARD) {
      if (pattern.test(line)) {
        failures += 1;
        console.error(`FAIL ${relative(root, file)}:${index + 1} ${message}`);
      }
    }
    for (const [pattern, message] of SOFT) {
      if (pattern.test(line)) {
        if (strict) failures += 1;
        else warnings += 1;
        console[strict ? "error" : "warn"](`${strict ? "FAIL" : "WARN"} ${relative(root, file)}:${index + 1} ${message}`);
      }
    }
  });
}
console.log(`check-content: ${files.length} files, ${failures} failure(s), ${warnings} warning(s)${strict ? " (strict)" : ""}`);
process.exit(failures > 0 ? 1 : 0);
