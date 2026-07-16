// Processes a score submitted as a GitHub issue titled "score|<points>|<elapsedMs>|<rounds>".
// Run by .github/workflows/duck-hunt-arcade.yml. Zero dependencies (Node 20+).
//
// Env expected:
//   GITHUB_TOKEN, GITHUB_REPOSITORY  (provided by Actions)
//   ISSUE_NUMBER, ISSUE_TITLE, ISSUE_USER
import { loadArcadeConfig, loadArcadeState, saveArcadeState, isPlausibleScore } from "./arcade-lib.js";

const cfg = loadArcadeConfig();
const state = loadArcadeState();

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY = "shailesh-stha/shailesh-stha",
  ISSUE_NUMBER,
  ISSUE_TITLE = "",
  ISSUE_USER = "unknown",
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

function rankOf(user) {
  const entries = Object.entries(state.leaderboard).sort((a, b) => b[1].score - a[1].score);
  return entries.findIndex(([u]) => u === user) + 1;
}

async function main() {
  const m = ISSUE_TITLE.trim().match(/^score\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*$/i);
  if (!m) {
    console.log("Not a score issue, skipping.");
    return;
  }
  const points = parseInt(m[1], 10);
  const elapsedMs = parseInt(m[2], 10);
  const rounds = parseInt(m[3], 10);

  if (!isPlausibleScore(points, elapsedMs, cfg)) {
    await commentAndClose(
      `🚫 **Score rejected.** ${points} points in ${(elapsedMs / 1000).toFixed(1)}s exceeds the ` +
        `plausible max (~${cfg.maxPointsPerSecond} pts/sec). If this is a false positive, tell ` +
        `@shailesh-stha your run details.`
    );
    return;
  }

  const existing = state.leaderboard[ISSUE_USER];
  if (existing && existing.score >= points) {
    await commentAndClose(
      `📋 **Not a new personal best.** Your best remains **${existing.score}** points. ` +
        `You're currently rank **#${rankOf(ISSUE_USER)}** on the leaderboard.`
    );
    return;
  }

  state.leaderboard[ISSUE_USER] = {
    score: points,
    rounds,
    elapsedMs,
    at: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
  };
  saveArcadeState(state);

  await commentAndClose(
    `## 🏆 New personal best!\n\n` +
      `**${points}** points across **${rounds}** round(s) — you're now rank **#${rankOf(
        ISSUE_USER
      )}** on the leaderboard.\n\n` +
      `The leaderboard updates in a minute (raw.githubusercontent.com caches briefly). Nice shooting!`
  );
  console.log(`Score processed: ${ISSUE_USER} -> ${points} pts, rank #${rankOf(ISSUE_USER)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
