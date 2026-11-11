// GitHub Pages serves the uploaded folder at the site's base path ("/shailesh-stha/"), but with a base path React Router pre-renders
// the pages into "<dir>/shailesh-stha/...". Move them up so "/shailesh-stha/cv/" maps to "<dir>/cv/index.html".
// Usage: node scripts/prepare-pages.mjs <build-client-dir> <base>   (a base of "/" or empty does nothing)
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function preparePages(dir, base) {
  const name = (base || "/").replace(/^\/+|\/+$/g, "");
  if (!name) return "base is /, nothing to move";
  const nested = join(dir, name);
  if (!existsSync(nested)) throw new Error(`expected pre-rendered pages in ${nested}`);
  cpSync(nested, dir, { recursive: true });
  rmSync(nested, { recursive: true, force: true });
  return `moved ${name}/ up into ${dir}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, base] = process.argv.slice(2);
  if (!dir) {
    console.error("usage: node scripts/prepare-pages.mjs <build-client-dir> <base>");
    process.exit(2);
  }
  console.log(preparePages(dir, base));
}
