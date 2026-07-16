// Processes a shot submitted as a GitHub issue titled "shoot|<CELL>".
// Run by .github/workflows/duck-hunt.yml. Zero dependencies (Node 20+).
//
// Env expected:
//   GITHUB_TOKEN, GITHUB_REPOSITORY  (provided by Actions)
//   ISSUE_NUMBER, ISSUE_TITLE, ISSUE_USER, ISSUE_CREATED_AT
import {
  loadConfig,
  loadState,
  saveState,
  generateSvg,
  updateReadme,
  duckCellAt,
  duckIndexAt,
  pathDistance,
  isValidSkyCell,
  windowLabelPlain,
} from "./lib.js";

const cfg = loadConfig();
const state = loadState();

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY = "shailesh-stha/shailesh-stha",
  ISSUE_NUMBER,
  ISSUE_TITLE = "",
  ISSUE_USER = "unknown",
  ISSUE_CREATED_AT = new Date().toISOString(),
} = process.env;

async function github(pathname, method = "GET", body) {
  if (!GITHUB_TOKEN) {
    console.log(`[dry-run] ${method} ${pathname}`, body ? JSON.stringify(body).slice(0, 200) : "");
    return {};
  }
  const res = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.error(`GitHub API ${method} ${pathname} failed: ${res.status} ${await res.text()}`);
  }
  return res.ok ? res.json().catch(() => ({})) : {};
}

async function commentAndClose(message) {
  if (!ISSUE_NUMBER) return console.log("[dry-run comment]\n" + message);
  await github(`/repos/${GITHUB_REPOSITORY}/issues/${ISSUE_NUMBER}/comments`, "POST", {
    body: message,
  });
  await github(`/repos/${GITHUB_REPOSITORY}/issues/${ISSUE_NUMBER}`, "PATCH", {
    state: "closed",
  });
}

function scheduleTable() {
  return (
    "| Zone | Duck is there (UTC seconds) |\n|:-:|:-:|\n" +
    cfg.flightPath.map((cell, i) => `| **${cell}** | ${windowLabelPlain(i, cfg)} |`).join("\n")
  );
}

async function main() {
  // 1. Parse target cell
  const m = ISSUE_TITLE.trim().match(/^shoot\s*\|\s*([A-Za-z]\d+)\s*$/i);
  if (!m) {
    console.log("Not a shot issue, skipping.");
    return;
  }
  const cell = m[1].toUpperCase();

  if (!isValidSkyCell(cell, cfg)) {
    await commentAndClose(
      `🚫 **${cell}** isn't in the sky, hunter! Aim at one of: ${cfg.flightPath.join(", ")}.\n\nHead back to the [profile](https://github.com/${GITHUB_REPOSITORY}) and click a 🎯 target.`
    );
    return;
  }

  // 2. Cooldown check
  const player = state.players[ISSUE_USER] || { hits: 0, shots: 0, lastShotAt: null };
  const now = new Date(ISSUE_CREATED_AT);
  if (player.lastShotAt) {
    const elapsed = (now - new Date(player.lastShotAt)) / 1000;
    if (elapsed < cfg.cooldownSeconds) {
      await commentAndClose(
        `⏳ **Reloading!** You can fire again in **${Math.ceil(
          cfg.cooldownSeconds - elapsed
        )}s**. (One shot every ${cfg.cooldownSeconds} seconds per hunter.)`
      );
      return;
    }
  }

  // 3. Score the shot against the clock-synced duck position
  const duckCell = duckCellAt(ISSUE_CREATED_AT, cfg);
  const dist = pathDistance(cell, duckCell, cfg);
  const hit = dist <= cfg.toleranceSteps;
  const bullseye = dist === 0;

  player.shots += 1;
  if (hit) player.hits += 1;
  player.lastShotAt = now.toISOString();
  state.players[ISSUE_USER] = player;
  state.counter += 1;
  state.lastShot = {
    user: ISSUE_USER,
    cell,
    duckCell,
    result: hit ? "hit" : "miss",
    at: now.toISOString().replace("T", " ").slice(0, 16) + " UTC",
  };

  // 4. Persist + regenerate visuals
  saveState(state);
  generateSvg(cfg, state);
  updateReadme(cfg, state, GITHUB_REPOSITORY);

  // 5. Report back on the issue
  const acc = Math.round((player.hits / player.shots) * 100);
  const statsLine = `**Your stats:** ${player.hits} hits / ${player.shots} shots (${acc}% accuracy)`;
  if (hit) {
    await commentAndClose(
      `## 🎯 ${bullseye ? "BULLSEYE" : "HIT"}!\n\n` +
        `The duck was in **${duckCell}** at ${state.lastShot.at} and you ${
          bullseye ? "nailed it dead-on" : `clipped it from **${cell}** (close enough — winged it!)`
        } 🦆💥\n\n${statsLine}\n\nThe board and leaderboard update in a minute (GitHub caches images briefly). Nice shooting!`
    );
  } else {
    await commentAndClose(
      `## 💨 Miss!\n\n` +
        `You fired at **${cell}**, but at ${state.lastShot.at} the duck was in **${duckCell}**. *The dog laughs at you.* 🐕\n\n` +
        `**Tip:** the duck flies on a fixed schedule synced to the UTC clock — check the seconds on your watch before you click:\n\n${scheduleTable()}\n\n${statsLine}`
    );
  }
  console.log(`Shot processed: ${ISSUE_USER} -> ${cell}, duck in ${duckCell} (idx ${duckIndexAt(ISSUE_CREATED_AT, cfg)}), ${hit ? "HIT" : "MISS"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
