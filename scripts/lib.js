// Duck Hunt — shared library (zero dependencies, Node 20+)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

const CONFIG_PATH = path.join(ROOT, "game", "config.json");
const STATE_PATH = path.join(ROOT, "game", "state.json");
const SVG_PATH = path.join(ROOT, "assets", "duck-hunt.svg");
const README_PATH = path.join(ROOT, "README.md");

export function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

export function loadState() {
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

export function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Timing — the duck's position is a pure function of UTC wall-clock time.
// position index = floor((utcSecondsIntoLoop) / secondsPerStep)
// ---------------------------------------------------------------------------

export function secondsPerStep(cfg) {
  return cfg.loopSeconds / cfg.flightPath.length;
}

export function duckIndexAt(dateLike, cfg) {
  const t = new Date(dateLike);
  const secOfLoop =
    (t.getUTCMinutes() * 60 + t.getUTCSeconds() + t.getUTCMilliseconds() / 1000) %
    cfg.loopSeconds;
  return Math.floor(secOfLoop / secondsPerStep(cfg)) % cfg.flightPath.length;
}

export function duckCellAt(dateLike, cfg) {
  return cfg.flightPath[duckIndexAt(dateLike, cfg)];
}

// Circular distance along the flight path (shots slightly early/late still count)
export function pathDistance(cellA, cellB, cfg) {
  const ia = cfg.flightPath.indexOf(cellA);
  const ib = cfg.flightPath.indexOf(cellB);
  if (ia === -1 || ib === -1) return Infinity;
  const n = cfg.flightPath.length;
  const d = Math.abs(ia - ib);
  return Math.min(d, n - d);
}

// Time window label for a path step, e.g. ":00 - :07"
export function windowLabelPlain(stepIndex, cfg) {
  const s = secondsPerStep(cfg);
  const from = Math.round(stepIndex * s) % 60;
  const to = Math.round((stepIndex + 1) * s);
  const pad = (n) => String(n).padStart(2, "0");
  return `:${pad(from)} - :${pad(to >= 60 ? 0 : to)}`;
}

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

export function allSkyCells(cfg) {
  const cells = [];
  for (const r of cfg.skyRows) for (const c of cfg.cols) cells.push(`${c}${r}`);
  return cells;
}

export function isValidSkyCell(cell, cfg) {
  return allSkyCells(cfg).includes(cell);
}

export function cellToXY(cell, cfg) {
  const col = cfg.cols.indexOf(cell[0]);
  const row = parseInt(cell.slice(1), 10) - 1;
  return {
    x: col * cfg.cellWidth,
    y: row * cfg.cellHeight,
    cx: col * cfg.cellWidth + cfg.cellWidth / 2,
    cy: row * cfg.cellHeight + cfg.cellHeight / 2,
  };
}

// ---------------------------------------------------------------------------
// SVG generation — NES-flavoured pixel art built from <rect> squares.
// SMIL animation moves the duck along the flight path (cosmetic; scoring
// follows the UTC clock, and each cell is labelled with its time window).
// ---------------------------------------------------------------------------

const PX = 4; // pixel size for sprite art

// 8-bit duck sprite, drawn on a small grid. Legend:
//   B=black outline, G=green head, Y=yellow beak, W=white ring, R=brown body, O=orange... keep minimal.
const DUCK_SPRITE = [
  "..........GGG...",
  ".........GGGGG..",
  ".........GBGGYY.",
  ".........GGGG...",
  "R..........WWW..",
  "RR.RRRRRRRRRRR..",
  ".RRRRRRRRRRRRR..",
  "..RRDDDDDDRRRR..",
  "..RRDDDDDDDRRR..",
  "...RRRRRRRRRR...",
  "....RRRRRRRR....",
  "......YY..YY....",
];

const SPRITE_COLORS = {
  G: "#2e7d32", // mallard green head
  B: "#111111", // eye
  Y: "#f9a825", // beak / feet
  W: "#fafafa", // neck ring
  R: "#6d4c41", // body
  D: "#4e342e", // wing (animated shade)
};

function spriteRects(sprite, colors, px) {
  let out = "";
  sprite.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (colors[ch]) {
        out += `<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}" fill="${colors[ch]}"/>`;
      }
    });
  });
  return out;
}

function duckGroup(cfg) {
  const w = DUCK_SPRITE[0].length * PX;
  const h = DUCK_SPRITE.length * PX;
  // translate values through cell centers, closing the loop back to start
  const pts = [...cfg.flightPath, cfg.flightPath[0]].map((cell) => {
    const { cx, cy } = cellToXY(cell, cfg);
    return `${cx - w / 2} ${cy - h / 2}`;
  });
  // hold at each cell then hop: duplicate each point to create a stepped feel
  const values = [];
  const keyTimes = [];
  const n = cfg.flightPath.length;
  for (let i = 0; i < n; i++) {
    values.push(pts[i], pts[i]);
    keyTimes.push(i / n, (i + 0.82) / n);
  }
  values.push(pts[n]);
  keyTimes.push(1);

  return `
  <g id="duck">
    <animateTransform attributeName="transform" attributeType="XML" type="translate"
      values="${values.join(";")}"
      keyTimes="${keyTimes.join(";")}"
      dur="${cfg.loopSeconds}s" repeatCount="indefinite"/>
    <g>
      <animateTransform attributeName="transform" attributeType="XML" type="translate"
        values="0 0; 0 -6; 0 0" dur="0.8s" repeatCount="indefinite"/>
      ${spriteRects(DUCK_SPRITE, SPRITE_COLORS, PX)}
      <rect x="${4 * PX}" y="${7 * PX}" width="${7 * PX}" height="${2 * PX}" fill="#4e342e">
        <animate attributeName="y" values="${7 * PX};${5 * PX};${7 * PX}" dur="0.45s" repeatCount="indefinite"/>
      </rect>
    </g>
  </g>`;
}

// simple pixel dog silhouette for the grass row
const DOG_SPRITE = [
  "..........BB..",
  ".........BBBB.",
  "..BBBBB..BBB..",
  ".BBBBBBBBBBB..",
  "BBBBBBBBBBB...",
  "B.BB....BB....",
  "..BB....BB....",
];

function groundGroup(cfg, width, groundY) {
  const grass = `<rect x="0" y="${groundY}" width="${width}" height="${cfg.cellHeight}" fill="#66bb6a"/>
  <rect x="0" y="${groundY}" width="${width}" height="6" fill="#43a047"/>`;
  const dog = `<g transform="translate(30 ${groundY + 18})">${spriteRects(
    DOG_SPRITE,
    { B: "#3e2723" },
    4
  )}</g>`;
  const bush = (x) =>
    `<g transform="translate(${x} ${groundY + 30})">
      <rect x="0" y="10" width="40" height="24" fill="#2e7d32"/>
      <rect x="6" y="2" width="28" height="12" fill="#2e7d32"/>
    </g>`;
  return grass + dog + bush(200) + bush(400);
}

export function generateSvg(cfg, state) {
  const width = cfg.cols.length * cfg.cellWidth;
  const skyHeight = cfg.skyRows.length * cfg.cellHeight;
  const groundY = skyHeight;
  const height = skyHeight + cfg.cellHeight;

  // grid overlay + labels + time windows for sky cells
  let grid = "";
  for (const cell of allSkyCells(cfg)) {
    const { x, y } = cellToXY(cell, cfg);
    const step = cfg.flightPath.indexOf(cell);
    grid += `<rect x="${x}" y="${y}" width="${cfg.cellWidth}" height="${cfg.cellHeight}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-dasharray="4 4"/>`;
    grid += `<text x="${x + 6}" y="${y + 16}" font-family="'Courier New',monospace" font-size="13" font-weight="bold" fill="#ffffff" fill-opacity="0.85">${cell}</text>`;
    if (step !== -1) {
      grid += `<text x="${x + cfg.cellWidth - 6}" y="${y + 16}" text-anchor="end" font-family="'Courier New',monospace" font-size="11" fill="#fff59d">${windowLabelPlain(step, cfg)}</text>`;
    }
  }

  // last-shot banner
  let banner = "";
  if (state.lastShot) {
    const s = state.lastShot;
    const txt =
      s.result === "hit"
        ? `LAST SHOT: @${s.user} HIT the duck in ${s.duckCell}!`
        : `LAST SHOT: @${s.user} missed (${s.cell}) - duck was in ${s.duckCell}`;
    const color = s.result === "hit" ? "#00e676" : "#ff8a80";
    banner = `<rect x="0" y="${height - 26}" width="${width}" height="26" fill="#1b2a1b" fill-opacity="0.85"/>
    <text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-family="'Courier New',monospace" font-size="13" font-weight="bold" fill="${color}">${escapeXml(
      txt
    )}</text>`;
  }

  const clouds = `
  <g fill="#ffffff" fill-opacity="0.9">
    <g><rect x="60" y="30" width="56" height="14"/><rect x="72" y="20" width="30" height="12"/></g>
    <g><rect x="330" y="120" width="56" height="14"/><rect x="342" y="110" width="30" height="12"/></g>
  </g>`;

  const title = `<text x="${width / 2}" y="34" text-anchor="middle" font-family="'Courier New',monospace" font-size="24" font-weight="bold" fill="#ffffff" stroke="#1a237e" stroke-width="0.5" opacity="0.95">DUCK HUNT</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Duck Hunt game board">
  <rect width="${width}" height="${skyHeight}" fill="#64b5f6"/>
  ${clouds}
  ${groundGroup(cfg, width, groundY)}
  ${grid}
  ${title}
  ${duckGroup(cfg)}
  ${banner}
</svg>
`;
  fs.writeFileSync(SVG_PATH, svg);
  return svg;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// README updating — rewrites content between marker comments.
// ---------------------------------------------------------------------------

function replaceBetween(text, startMark, endMark, replacement) {
  const start = text.indexOf(startMark);
  const end = text.indexOf(endMark);
  if (start === -1 || end === -1) return text;
  return (
    text.slice(0, start + startMark.length) + "\n" + replacement + "\n" + text.slice(end)
  );
}

export function shootUrl(owner, repo, cell) {
  const title = encodeURIComponent(`shoot|${cell}`);
  const body = encodeURIComponent(
    "Pull the trigger by clicking **Create** below. A robot referee scores this shot within ~30 seconds, comments the result here, and closes the issue. Nothing else to do!"
  );
  return `https://github.com/${owner}/${repo}/issues/new?title=${title}&body=${body}`;
}

export function updateReadme(cfg, state, ownerRepo) {
  if (!fs.existsSync(README_PATH)) return;
  let md = fs.readFileSync(README_PATH, "utf8");
  const [owner, repo] = ownerRepo.split("/");

  // 1. board image with cache-buster
  md = replaceBetween(
    md,
    "<!--HUNT:BOARD:START-->",
    "<!--HUNT:BOARD:END-->",
    `<img src="assets/duck-hunt.svg?v=${state.counter}" alt="Duck Hunt board" width="480"/>`
  );

  // 2. shoot buttons (one link per sky cell, laid out as a table matching the grid)
  const rows = cfg.skyRows
    .map(
      (r) =>
        "| " +
        cfg.cols
          .map((c) => `[🎯 ${c}${r}](${shootUrl(owner, repo, `${c}${r}`)})`)
          .join(" | ") +
        " |"
    )
    .join("\n");
  const header = "| " + cfg.cols.map(() => "   ").join(" | ") + " |";
  const divider = "| " + cfg.cols.map(() => ":-:").join(" | ") + " |";
  md = replaceBetween(
    md,
    "<!--HUNT:AIM:START-->",
    "<!--HUNT:AIM:END-->",
    `${header}\n${divider}\n${rows}`
  );

  // 3. status line
  let status = "*No shots fired yet. Be the first hunter!*";
  if (state.lastShot) {
    const s = state.lastShot;
    status =
      s.result === "hit"
        ? `🎯 **@${s.user}** hit the duck in **${s.duckCell}**! (${s.at})`
        : `💨 **@${s.user}** shot at **${s.cell}** but the duck was in **${s.duckCell}**. (${s.at})`;
  }
  md = replaceBetween(md, "<!--HUNT:STATUS:START-->", "<!--HUNT:STATUS:END-->", status);

  // 4. leaderboard
  const entries = Object.entries(state.players)
    .map(([user, p]) => ({ user, ...p }))
    .sort((a, b) => b.hits - a.hits || a.shots - b.shots)
    .slice(0, cfg.leaderboardSize);
  let board = "*Nobody on the board yet.*";
  if (entries.length) {
    board =
      "| # | Hunter | Hits | Shots | Accuracy |\n|:-:|:--|:-:|:-:|:-:|\n" +
      entries
        .map(
          (e, i) =>
            `| ${i + 1} | [@${e.user}](https://github.com/${e.user}) | ${e.hits} | ${e.shots} | ${Math.round(
              (e.hits / Math.max(1, e.shots)) * 100
            )}% |`
        )
        .join("\n");
  }
  md = replaceBetween(md, "<!--HUNT:LEADERBOARD:START-->", "<!--HUNT:LEADERBOARD:END-->", board);

  fs.writeFileSync(README_PATH, md);
}
