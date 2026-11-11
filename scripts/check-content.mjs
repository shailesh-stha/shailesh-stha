// Content gate for the public repo: nothing pending, private or incomplete may be committed or deployed.
// Default: hard rules fail, TODO text only warns. `--strict` (use before deploying) also fails on TODO text.
// `--root <dir>` scans another project folder (used by the tests).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 ? args[rootArg + 1] : fileURLToPath(new URL("../", import.meta.url));

// Public contact addresses live in exactly one file; an email anywhere else fails.
const EMAIL_FILE = "app/content/profile.ts";

const HARD = [
  { pattern: /disclosure:\s*"pending"/, message: "pending content must not be in the public repo (keep it in _profile/)" },
  { pattern: /[\w.+-]+@[\w-]+\.[\w.]{2,}/, message: `email address outside ${EMAIL_FILE}`, allow: [EMAIL_FILE] },
  { pattern: /\+\d[\d\s()-]{7,}/, message: "phone number" },
  { pattern: /Bögl|Boegl|\bKSA\b|Belgrad|STR-PDF/, message: "client, partner or internal tool name" },
  { pattern: /date of birth|geburtsdatum/i, message: "personal data" },
];
const SOFT = [{ pattern: /TODO/, message: "TODO text" }];

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
  const rel = relative(root, file).replaceAll("\\", "/");
  readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    for (const { pattern, message, allow } of HARD) {
      if (allow?.includes(rel)) continue;
      if (pattern.test(line)) {
        failures += 1;
        console.error(`FAIL ${rel}:${index + 1} ${message}`);
      }
    }
    for (const { pattern, message } of SOFT) {
      if (pattern.test(line)) {
        if (strict) failures += 1;
        else warnings += 1;
        console[strict ? "error" : "warn"](`${strict ? "FAIL" : "WARN"} ${rel}:${index + 1} ${message}`);
      }
    }
  });
}
console.log(`check-content: ${files.length} files, ${failures} failure(s), ${warnings} warning(s)${strict ? " (strict)" : ""}`);
process.exit(failures > 0 ? 1 : 0);
