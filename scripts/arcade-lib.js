// Shared helpers for the interactive arcade game's leaderboard bot.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CONFIG_PATH = path.join(ROOT, "game", "arcade-config.json");
const STATE_PATH = path.join(ROOT, "game", "arcade-state.json");

export function loadArcadeConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

export function loadArcadeState() {
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

export function saveArcadeState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

// Honor-system anti-cheat: client-run gameplay can't be replayed server-side
// the way the clock-synced shooting-gallery game can, so this just rejects
// obviously-tampered submissions rather than proving legitimacy.
export function isPlausibleScore(points, elapsedMs, cfg, marginPoints = 200) {
  const seconds = elapsedMs / 1000;
  return points <= seconds * cfg.maxPointsPerSecond + marginPoints;
}
