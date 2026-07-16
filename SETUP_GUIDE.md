# 🦆 Duck Hunt Profile Game — Setup Guide

A nostalgic Duck Hunt game that lives entirely inside your GitHub profile repo (`shailesh-stha/shailesh-stha`). No external hosting, no dependencies, no build step.

## How it works (30-second version)

- The README embeds an animated SVG: an 8-bit duck flying a fixed 60-second loop across a 4×2 sky grid.
- The duck's *scoring* position is synced to the **UTC clock** — each zone is labelled with the seconds window when the duck is there (`A1 = :00-:07`, `B1 = :07-:15`, …).
- Visitors time their shot against the clock and click a 🎯 target link, which opens a pre-filled GitHub issue (`shoot|B1`).
- A GitHub Action fires on issue creation, scores the shot, comments HIT/MISS, closes the issue, updates the leaderboard + board SVG, and commits.

## File map

```
README.md                          ← your profile (game embedded between marker comments)
assets/duck-hunt.svg               ← generated game board (animated, pixel art)
game/config.json                   ← grid, flight path, timing, cooldown — tweak here
game/state.json                    ← scores & last shot (managed by the bot)
scripts/lib.js                     ← shared logic + SVG generator
scripts/shoot.js                   ← scores a shot (run by the Action)
scripts/generate.js                ← regenerates SVG + README sections manually
.github/workflows/duck-hunt.yml    ← the Action
```

## Upload steps

1. **Copy everything** in this folder into the root of your `shailesh-stha/shailesh-stha` repo (keep the folder structure, including `.github/workflows/`). If you already have a README, merge your content around the game section — just keep all `<!--HUNT:...-->` marker comments intact, exactly as they are.

2. **Commit & push to `main`.**

3. **Enable Actions write access** (usually already on, but check):
   Repo → Settings → Actions → General → Workflow permissions → select **"Read and write permissions"** → Save.

4. **Enable Issues**: Repo → Settings → General → Features → tick **Issues**.

5. **Test it yourself**: open your profile, click a 🎯 target, press *Create* on the issue. Within ~30–60s the bot should comment on the issue, close it, and push a commit updating the board.

That's it. The game is live.

## Playing / verifying

- Watch the seconds on any clock. If it's `:10`, the duck "is" in **B1** (window `:07-:15`).
- Shots one zone off along the flight path still count as a hit ("winged it") — this compensates for the few seconds between deciding and GitHub registering the issue.
- Each player gets one shot per 30 seconds (anti-spam).

## Tuning (`game/config.json`)

| Key | What it does | Default |
|---|---|---|
| `flightPath` | Cells the duck visits, in order | 8-cell loop |
| `loopSeconds` | Full loop duration | 60 |
| `toleranceSteps` | How many zones off still counts as a hit (0 = bullseye only) | 1 |
| `cooldownSeconds` | Per-player time between shots | 30 |
| `leaderboardSize` | Rows shown in README | 10 |

After changing config, run `node scripts/generate.js shailesh-stha/shailesh-stha` locally and commit, or just wait — the next shot regenerates everything.

## Known quirks (by design / GitHub limitations)

- **Image caching:** GitHub proxies README images through Camo and caches them for a few minutes. The board/leaderboard update on every shot, but visitors may see a slightly stale image. The `?v=N` cache-buster in the README minimizes this.
- **Animation vs. scoring:** SVG animations restart whenever the image loads, so the *animated* duck can't be perfectly synced to every visitor's view. That's why scoring follows the UTC clock and each zone shows its time window — the animation shows the flight path; the clock is the truth. (This is the honest limit of "no JavaScript in READMEs.")
- **Closed issues pile up:** every shot is a closed issue. That's normal for this genre of profile game (community chess works the same way). You can bulk-delete them occasionally if you like.
- **Bot commits:** each shot creates a commit on `main` (`🦆 shot fired by @user`). Your contribution graph will love it.

## Maintenance

- **Reset the game:** restore `game/state.json` to `{"counter": 0, "lastShot": null, "players": {}}`, run `node scripts/generate.js`, commit.
- **Regenerate manually anytime:** `node scripts/generate.js shailesh-stha/shailesh-stha` (Node 18+; zero npm dependencies).

## The other game: interactive arcade version

The README embed above is a novelty limited by what GitHub allows inside rendered
Markdown — no JavaScript, no real clicks, only pre-made links. For an actual free-flying,
click-to-shoot Duck Hunt, there's a second, fully interactive game hosted on GitHub Pages.

Each duck has a time limit (`timeLimitMs` in `difficultyForRound()`, `docs/game.js`) — past
`WARNING_RATIO` (55%) of that limit it flashes a pulsing red ring + "!"; if it's not hit before
the limit runs out it flies away and costs a life, same as missing all your bullets.

### File map (arcade game)

```
docs/index.html                        ← the playable page (canvas, HUD, leaderboard panel)
docs/game.js                           ← game loop + pure logic (spawn/update/hit/difficulty)
game/arcade-config.json                ← lives, bullets/round, anti-cheat cap, leaderboard size
game/arcade-state.json                 ← leaderboard (managed by the bot)
scripts/arcade-lib.js                  ← load/save arcade state+config, score plausibility check
scripts/submit-score.js                ← scores a submission (run by the arcade Action)
scripts/test-game-logic.mjs            ← run with `node scripts/test-game-logic.mjs` to self-check the logic
.github/workflows/duck-hunt-arcade.yml ← the Action that verifies scores and updates the leaderboard
```

### One-time setup

1. Push this repo to `main` (same repo as the README game — no separate repo needed).
2. Repo → Settings → Pages → **Source: Deploy from a branch** → Branch: `main`, Folder: `/docs` → Save.
3. Wait a minute, then visit `https://shailesh-stha.github.io/shailesh-stha/`.

### How scoring works

- Gameplay runs entirely in the player's browser (real random duck flight, real clicks) — there's
  no way to replay that server-side, unlike the clock-synced README game. So score submission is
  **honor-system**: finishing a run opens a GitHub issue titled `score|<points>|<elapsedMs>|<rounds>`,
  and `scripts/submit-score.js` just rejects submissions that exceed a plausible points-per-second
  cap (`maxPointsPerSecond` in `game/arcade-config.json`). It's a sanity check, not proof of legitimacy.
- Only a new personal best updates the leaderboard, so resubmitting a lower score is a no-op.
- The page fetches `game/arcade-state.json` straight from `raw.githubusercontent.com` (no backend) —
  same caching quirk as the README board: a just-submitted score can take a minute to show up.

### Tuning (`game/arcade-config.json`)

| Key | What it does | Default |
|---|---|---|
| `startLives` | Lives before Game Over | 3 |
| `bulletsPerRound` | Shots per duck-round | 3 |
| `maxPointsPerSecond` | Anti-cheat plausibility cap | 150 |
| `leaderboardSize` | Rows shown in the leaderboard panel | 10 |

## Ideas for later

- Seasonal skins (swap sprite colors in `scripts/lib.js`)
- "Duck of the day" bonus cell worth 2 points
- A second, faster duck with `loopSeconds: 30`
- Weekly leaderboard reset via a cron workflow
