// Regenerates assets/duck-hunt.svg and the dynamic README sections.
// Usage: node scripts/generate.js [owner/repo]
import { loadConfig, loadState, generateSvg, updateReadme } from "./lib.js";

const cfg = loadConfig();
const state = loadState();
const ownerRepo =
  process.argv[2] || process.env.GITHUB_REPOSITORY || "shailesh-stha/shailesh-stha";

generateSvg(cfg, state);
updateReadme(cfg, state, ownerRepo);
console.log(`Regenerated SVG + README for ${ownerRepo} (v${state.counter}).`);
