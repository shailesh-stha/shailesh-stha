// Runnable self-check for the interactive arcade game's logic.
// Usage: node scripts/test-game-logic.mjs
import assert from "node:assert/strict";
import {
  isHit,
  duckHitCircle,
  difficultyForRound,
  spawnDuck,
  updateDuck,
  WARNING_RATIO,
  DUCK_W,
  DUCK_H,
} from "../docs/game.js";
import { isPlausibleScore } from "./arcade-lib.js";

// isHit: circular hitbox, larger than the sprite's bounding box
{
  const duck = { x: 100, y: 100, alive: true, fallen: false };
  const { cx, cy, radius } = duckHitCircle(duck);
  assert.equal(isHit(duck, cx, cy), true, "dead center should hit");
  assert.equal(isHit(duck, cx + radius - 1, cy), true, "just inside radius should hit");
  assert.equal(isHit(duck, cx + radius + 5, cy), false, "past radius should miss");
  assert.equal(isHit(duck, 0, 0), false, "far away should miss");
  assert.equal(isHit({ ...duck, fallen: true }, cx, cy), false, "fallen duck can't be hit");
  assert.ok(radius > Math.max(DUCK_W, DUCK_H) / 2, "hitbox radius should exceed the sprite's half-size");
}

// difficultyForRound: speed increases, second duck from round 4
{
  const r1 = difficultyForRound(1);
  const r4 = difficultyForRound(4);
  assert.ok(r4.speed > r1.speed, "speed should increase with round");
  assert.equal(r1.ducks, 1, "round 1 has one duck");
  assert.equal(r4.ducks, 2, "round 4+ has two ducks");
}

// spawnDuck: stays within bounds
{
  const bounds = { width: 640, groundY: 390 };
  const duck = spawnDuck(bounds, 1, () => 0.5);
  assert.ok(duck.x >= 0 && duck.x <= bounds.width - DUCK_W, "duck x within bounds");
  assert.ok(duck.y >= 0 && duck.y <= bounds.groundY - DUCK_H, "duck y within bounds");
}

// updateDuck: bounces off edges instead of leaving canvas
{
  const bounds = { width: 640, groundY: 390 };
  const duck = { x: 0, y: 100, vx: -50, vy: 0, alive: true, fallen: false, age: 0, nextTurnAt: 999999 };
  const next = updateDuck(duck, 16, 0, bounds, 1, () => 0.5);
  assert.ok(next.x >= 0, "duck should not go past left edge");
  assert.ok(next.vx > 0, "velocity should flip after bounce");
}

// updateDuck: urgency timer — warns, then flees upward, then leaves for good
{
  const bounds = { width: 640, groundY: 390 };
  const round = 1;
  const { timeLimitMs } = difficultyForRound(round);
  let duck = {
    x: 0,
    y: 100,
    vx: 10,
    vy: 0,
    alive: true,
    fallen: false,
    escaping: false,
    gone: false,
    age: 0,
    nextTurnAt: 999999,
  };

  const beforeWarning = updateDuck(duck, timeLimitMs * WARNING_RATIO - 100, 0, bounds, round, () => 0.5);
  assert.equal(beforeWarning.warning, false, "should not warn before the warning threshold");
  assert.equal(beforeWarning.escaping, false, "should not flee before the time limit");

  const pastWarning = updateDuck(beforeWarning, 200, 0, bounds, round, () => 0.5);
  assert.equal(pastWarning.warning, true, "should warn once past WARNING_RATIO of the time limit");
  assert.equal(pastWarning.escaping, false, "should not flee yet, just warn");

  const fleeingDuck = updateDuck(pastWarning, timeLimitMs, 0, bounds, round, () => 0.5);
  assert.equal(fleeingDuck.escaping, true, "should start fleeing once age exceeds the time limit");
  assert.ok(fleeingDuck.vy < 0, "fleeing duck should climb upward");
  assert.equal(fleeingDuck.gone, false, "shouldn't be gone the instant it starts fleeing");
  const { cx, cy } = duckHitCircle(fleeingDuck);
  assert.equal(isHit(fleeingDuck, cx, cy), true, "fleeing duck can still be hit before it's gone");

  const goneDuck = updateDuck(fleeingDuck, 5000, 0, bounds, round, () => 0.5);
  assert.equal(goneDuck.gone, true, "duck should be marked gone once it climbs off the top of the canvas");
  assert.ok(goneDuck.y < fleeingDuck.y, "fleeing duck should have moved upward before going");
  assert.equal(isHit(goneDuck, cx, cy), false, "gone duck can no longer be hit");

  const frozen = updateDuck(goneDuck, 5000, 0, bounds, round, () => 0.5);
  assert.equal(frozen.y, goneDuck.y, "gone duck should stop updating position");
}

// isPlausibleScore: at cap, over cap, zero elapsed time
{
  const cfg = { maxPointsPerSecond: 150 };
  assert.equal(isPlausibleScore(1700, 10000, cfg), true, "exactly at cap + margin should pass");
  assert.equal(isPlausibleScore(1701 + 200, 10000, cfg), false, "over cap should fail");
  assert.equal(isPlausibleScore(0, 0, cfg), true, "zero score/time should pass");
  assert.equal(isPlausibleScore(500, 0, cfg), false, "nonzero score at zero elapsed should fail");
}

console.log("All game logic checks passed.");
