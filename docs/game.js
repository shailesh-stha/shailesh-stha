// Duck Scout — pure logic (no DOM) + canvas rendering/loop glue.
// Pure functions are exported so scripts/test-game-logic.mjs can assert on them from Node.

export const DUCK_SPRITE = [
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

export const SPRITE_COLORS = {
  G: "#2e7d32",
  B: "#111111",
  Y: "#f9a825",
  W: "#fafafa",
  R: "#6d4c41",
  D: "#4e342e",
};

export const DUCK_PX = 4;
export const DUCK_W = DUCK_SPRITE[0].length * DUCK_PX;
export const DUCK_H = DUCK_SPRITE.length * DUCK_PX;

// ---------------------------------------------------------------------------
// Difficulty curve
// ---------------------------------------------------------------------------

export function difficultyForRound(round) {
  return {
    speed: 90 + (round - 1) * 18, // px/sec
    ducks: round >= 4 ? 2 : 1,
    turnIntervalMs: Math.max(500, 1400 - (round - 1) * 80),
    timeLimitMs: Math.max(1800, 4200 - (round - 1) * 250), // time before the duck flies off
  };
}

export function pointsForHit(round) {
  return 100 * round;
}

// Fraction of timeLimitMs at which the duck starts showing its "about to
// flee" warning sign.
export const WARNING_RATIO = 0.55;

// ---------------------------------------------------------------------------
// Duck spawn/update — genuinely free-flying, not grid-locked.
// ---------------------------------------------------------------------------

export function spawnDuck(bounds, round, rng = Math.random) {
  const { speed } = difficultyForRound(round);
  const x = rng() * (bounds.width - DUCK_W);
  const y = bounds.groundY - DUCK_H - rng() * (bounds.groundY * 0.4);
  const angle = rng() * Math.PI * 2;
  const vx = Math.cos(angle) * speed;
  return {
    x,
    y,
    vx,
    vy: Math.sin(angle) * speed * 0.6, // flatten vertical travel a bit
    facingRight: vx >= 0,
    alive: true,
    fallen: false,
    escaping: false, // past its time limit, fleeing upward off-screen
    gone: false, // fully offscreen after escaping — this is what costs a life
    warning: false,
    age: 0,
    nextTurnAt: 0,
  };
}

export function updateDuck(duck, dtMs, elapsedMs, bounds, round, rng = Math.random) {
  if (duck.fallen || duck.gone) return duck;
  const dt = dtMs / 1000;
  let { x, y, vx, vy } = duck;

  if (duck.escaping) {
    x += vx * dt;
    y += vy * dt;
    const facingRight = vx !== 0 ? vx > 0 : duck.facingRight;
    const gone = y + DUCK_H < -10;
    return { ...duck, x, y, facingRight, gone };
  }

  x += vx * dt;
  y += vy * dt;

  if (x <= 0 || x + DUCK_W >= bounds.width) {
    vx = -vx;
    x = Math.max(0, Math.min(x, bounds.width - DUCK_W));
  }
  if (y <= 0 || y + DUCK_H >= bounds.groundY) {
    vy = -vy;
    y = Math.max(0, Math.min(y, bounds.groundY - DUCK_H));
  }

  const { speed, turnIntervalMs, timeLimitMs } = difficultyForRound(round);
  let nextTurnAt = duck.nextTurnAt;
  if (elapsedMs >= nextTurnAt) {
    const angle = rng() * Math.PI * 2;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed * 0.6;
    nextTurnAt = elapsedMs + turnIntervalMs * (0.6 + rng() * 0.8);
  }

  const facingRight = vx !== 0 ? vx > 0 : duck.facingRight;
  const age = duck.age + dtMs;
  const warning = age >= timeLimitMs * WARNING_RATIO;

  if (age >= timeLimitMs) {
    // Start fleeing: climb straight up, keeping whatever horizontal drift it had.
    return {
      ...duck,
      x,
      y,
      vx,
      vy: -Math.abs(speed) * 1.8,
      facingRight,
      nextTurnAt,
      age,
      warning: true,
      escaping: true,
    };
  }

  return { ...duck, x, y, vx, vy, facingRight, nextTurnAt, age, warning };
}

// Circular hitbox, deliberately larger than the sprite's bounding box —
// pixel-perfect hit detection on an 8-bit sprite feels unfair at speed.
export const HIT_RADIUS_SCALE = 1.3;

export function duckHitCircle(duck) {
  return {
    cx: duck.x + DUCK_W / 2,
    cy: duck.y + DUCK_H / 2,
    radius: (Math.max(DUCK_W, DUCK_H) / 2) * HIT_RADIUS_SCALE,
  };
}

export function isHit(duck, clickX, clickY) {
  if (!duck.alive || duck.fallen || duck.gone) return false;
  const { cx, cy, radius } = duckHitCircle(duck);
  const dx = clickX - cx;
  const dy = clickY - cy;
  return dx * dx + dy * dy <= radius * radius;
}

// ---------------------------------------------------------------------------
// Score plausibility (mirrors scripts/arcade-lib.js's isPlausibleScore, kept
// in sync manually — small enough that a shared import isn't worth the extra
// module boundary between browser ESM and Node CJS/ESM interop).
// ponytail: duplicated on purpose, see scripts/arcade-lib.js for the server-
// side copy that actually gates the leaderboard.
// ---------------------------------------------------------------------------

export function isPlausibleScore(points, elapsedMs, maxPointsPerSecond, marginPoints = 200) {
  const seconds = elapsedMs / 1000;
  return points <= seconds * maxPointsPerSecond + marginPoints;
}

// ---------------------------------------------------------------------------
// Rendering + game loop — only runs in a browser (uses canvas/DOM/WebAudio).
// ---------------------------------------------------------------------------

function drawSprite(ctx, sprite, colors, px, ox, oy) {
  sprite.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (colors[ch]) {
        ctx.fillStyle = colors[ch];
        ctx.fillRect(ox + x * px, oy + y * px, px, px);
      }
    });
  });
}

// Sprite is drawn facing right by default; mirror for left-facing flight.
// Wing overlay flaps independently of body (matches the README SVG's animated wing).
function drawDuck(ctx, duck, elapsedMs) {
  const { x: ox, y: oy, facingRight } = duck;
  ctx.save();
  if (!facingRight) {
    ctx.translate(ox + DUCK_W, oy);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(ox, oy);
  }
  drawSprite(ctx, DUCK_SPRITE, SPRITE_COLORS, DUCK_PX, 0, 0);
  const flap = (Math.sin(elapsedMs / 90) + 1) / 2; // 0..1
  const wingY = (7 - flap * 2) * DUCK_PX;
  ctx.fillStyle = SPRITE_COLORS.D;
  ctx.fillRect(4 * DUCK_PX, wingY, 7 * DUCK_PX, 2 * DUCK_PX);
  ctx.restore();
}

// Pulsing red ring + "!" — shown once a duck is past WARNING_RATIO of its
// time limit, signalling it's about to fly off for good.
function drawUrgencyWarning(ctx, duck, elapsedMs) {
  const pulse = (Math.sin(elapsedMs / 110) + 1) / 2; // fast pulse, 0..1
  const { cx, cy, radius } = duckHitCircle(duck);
  ctx.strokeStyle = `rgba(255, 61, 0, ${0.35 + 0.4 * pulse})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4 + pulse * 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 61, 0, ${0.6 + 0.4 * pulse})`;
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("!", cx, duck.y - 6);
}

// Slightly different whites so overlapping clouds still read as separate shapes.
const CLOUD_SHADES = [
  "rgba(255,255,255,0.92)",
  "rgba(240,247,255,0.88)",
  "rgba(226,238,252,0.85)",
  "rgba(255,250,240,0.88)",
];

function makeClouds(width, rng = Math.random) {
  return Array.from({ length: 6 }, () => ({
    x: rng() * width,
    y: 15 + rng() * 110,
    scale: 0.55 + rng() * 1.1,
    speed: 4 + rng() * 8,
    color: CLOUD_SHADES[Math.floor(rng() * CLOUD_SHADES.length)],
  }));
}

function drawCloud(ctx, c) {
  ctx.fillStyle = c.color;
  ctx.fillRect(c.x, c.y, 56 * c.scale, 14 * c.scale);
  ctx.fillRect(c.x + 12 * c.scale, c.y - 10 * c.scale, 30 * c.scale, 12 * c.scale);
}

const GRASS_SHADES = ["#388e3c", "#2e7d32", "#4caf50", "#1b5e20"];

function makeGrassTufts(width, groundY, rng = Math.random) {
  return Array.from({ length: 220 }, () => {
    const tall = rng() < 0.25;
    return {
      x: rng() * width,
      y: groundY + 4 + rng() * 78,
      h: tall ? 10 + rng() * 14 : 3 + rng() * 6,
      w: tall ? 4 : 3,
      color: GRASS_SHADES[Math.floor(rng() * GRASS_SHADES.length)],
    };
  });
}

function drawGrassTufts(ctx, tufts) {
  tufts.forEach((t) => {
    ctx.fillStyle = t.color;
    ctx.fillRect(t.x, t.y - t.h, t.w, t.h);
  });
}

// Paired [main, shadow] shades per bush — picked far enough apart in the
// palette that overlapping bushes stay visually distinct from each other.
const BUSH_SHADES = [
  ["#2e7d32", "#1b5e20"],
  ["#43a047", "#2e7d32"],
  ["#33691e", "#1b5e20"],
  ["#558b2f", "#33691e"],
];

function makeBushes(width, groundY, rng = Math.random) {
  const count = 3 + Math.floor(rng() * 4); // 3..6
  return Array.from({ length: count }, () => ({
    x: rng() * (width - 60),
    scale: 0.75 + rng() * 0.6, // 0.75x .. 1.35x
    shades: BUSH_SHADES[Math.floor(rng() * BUSH_SHADES.length)],
  }));
}

// Bushes straddle the horizon like the tall grass tufts do — their tops poke
// above groundY into the sky instead of being flush with the grass line.
function drawBush(ctx, x, groundY, scale = 1, shades = BUSH_SHADES[0]) {
  const [main, shadow] = shades;
  ctx.fillStyle = main;
  ctx.fillRect(x - 10 * scale, groundY - 10 * scale, 64 * scale, 44 * scale);
  ctx.fillRect(x, groundY - 26 * scale, 46 * scale, 26 * scale);
  ctx.fillStyle = shadow;
  ctx.fillRect(x - 10 * scale, groundY + 20 * scale, 64 * scale, 8 * scale);
}

function beep(ctx, freq, durationMs, type = "square") {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.05;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
  osc.stop(ctx.currentTime + durationMs / 1000);
}

export function createGame(canvas, opts) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const groundY = height - 90;
  const bounds = { width, groundY };
  const cfg = opts.cfg;
  let audioCtx = null;

  let round = 1;
  let lives = cfg.startLives;
  let bullets = cfg.bulletsPerRound;
  let score = 0;
  let ducks = [];
  let startedAt = performance.now();
  let lastFrame = startedAt;
  let over = false;
  let paused = false;
  const clouds = makeClouds(width);
  const grassTufts = makeGrassTufts(width, groundY);
  const bushes = makeBushes(width, groundY);
  let debug = true;
  window.addEventListener("keydown", (e) => {
    if (e.key === "d" || e.key === "D") debug = !debug;
  });

  let roundOver = false;
  function newRound() {
    const { ducks: n } = difficultyForRound(round);
    ducks = Array.from({ length: n }, () => spawnDuck(bounds, round));
    bullets = cfg.bulletsPerRound;
    roundOver = false;
  }
  newRound();

  function ensureAudio() {
    if (!audioCtx && window.AudioContext) audioCtx = new window.AudioContext();
    return audioCtx;
  }

  function shoot(clickX, clickY) {
    if (over || paused || bullets <= 0) return;
    bullets -= 1;
    const target = ducks.find((d) => isHit(d, clickX, clickY));
    if (target) {
      target.fallen = true;
      target.alive = false;
      score += pointsForHit(round);
      beep(ensureAudio(), 880, 120);
      opts.onScore?.(score);
      if (ducks.every((d) => d.fallen)) {
        round += 1;
        opts.onRound?.(round);
        setTimeout(newRound, 700);
      }
    } else {
      beep(ensureAudio(), 180, 150, "sawtooth");
      if (bullets <= 0 && ducks.some((d) => !d.fallen)) {
        loseLife();
      }
    }
  }

  function loseLife() {
    if (roundOver) return;
    roundOver = true;
    lives -= 1;
    opts.onLives?.(lives);
    if (lives <= 0) {
      over = true;
      opts.onGameOver?.({ score, round, elapsedMs: performance.now() - startedAt });
    } else {
      round = Math.max(1, round); // stays same round, retry
      setTimeout(newRound, 700);
    }
  }

  // Sky/clouds/land only — the flat base a duck flies in front of.
  function drawSceneBase(dtMs) {
    ctx.fillStyle = "#64b5f6";
    ctx.fillRect(0, 0, width, groundY);
    clouds.forEach((c) => {
      c.x += (c.speed * dtMs) / 1000;
      if (c.x > width + 60) c.x = -60;
      drawCloud(ctx, c);
    });

    ctx.fillStyle = "#66bb6a";
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = "#43a047";
    ctx.fillRect(0, groundY, width, 6);
  }

  // Grass/bushes drawn after the duck — foreground foliage sits in front of it.
  function drawSceneForeground() {
    drawGrassTufts(ctx, grassTufts);
    bushes.forEach((b) => drawBush(ctx, b.x, groundY, b.scale, b.shades));
  }

  function drawDebugHitboxes() {
    ducks.forEach((d) => {
      if (d.fallen || d.gone) return;
      const { cx, cy, radius } = duckHitCircle(d);
      ctx.strokeStyle = "rgba(255, 235, 59, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function frame(now) {
    if (over || paused) return;
    const dtMs = now - lastFrame;
    lastFrame = now;
    const elapsedMs = now - startedAt;

    drawSceneBase(dtMs);
    ducks = ducks.map((d) => updateDuck(d, dtMs, elapsedMs, bounds, round));
    ducks.forEach((d) => {
      if (d.fallen || d.gone) return;
      drawDuck(ctx, d, elapsedMs);
      if (d.warning && !d.escaping) drawUrgencyWarning(ctx, d, elapsedMs);
    });
    drawSceneForeground();
    if (debug) drawDebugHitboxes();

    ducks.forEach((d) => {
      if (d.escaping && !d.fleeSoundPlayed) {
        d.fleeSoundPlayed = true;
        beep(ensureAudio(), 520, 180, "sine");
      }
    });

    if (!roundOver && ducks.some((d) => d.gone)) {
      loseLife();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    shoot((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  });

  return {
    getState: () => ({ score, round, lives, bullets, over }),
  };
}
