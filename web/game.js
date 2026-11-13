// Game rules for Flappy Jensen, with no drawing or input. Numbers follow the
// original Flappy Bird (Android v1.3) scaled 1.5x: its 400px-tall field is our 600.
(function (root) {
  "use strict";

  const C = {
    WIDTH: 400, HEIGHT: 600, BIRD_X: 100, BIRD_R: 12,
    GRAVITY: 0.45, FLAP_VY: -7.5, MAX_FALL: 12, SPEED: 3,
    GATE_W: 78, GATE_GAP: 144, GATE_SPACING: 235.5, FIRST_GATE_X: 350,
    // Gap centres: the original picks the lower pipe's top uniformly in 180..360.
    GAP_LO: 198, GAP_HI: 468,
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Every gap centre is independent and uniform, as in the original.
  function randomGaps(rand) {
    return () => C.GAP_LO + rand() * (C.GAP_HI - C.GAP_LO);
  }

  function createGame(nextGap) {
    const g = { y: C.HEIGHT / 2, prevY: C.HEIGHT / 2, vy: 0, t: 0, score: 0, alive: true, gates: [], nextGap };
    for (let i = 0; i < 4; i++) g.gates.push({ x: C.FIRST_GATE_X + i * C.GATE_SPACING, gap: nextGap(), passed: false });
    return g;
  }

  function upcoming(g) {
    for (let i = 0; i < g.gates.length; i++) if (!g.gates[i].passed) return i;
    return -1;
  }

  // Circle vs axis-aligned rectangle: distance from the centre to the closest point of the rect.
  function circleHitsRect(cx, cy, r, x0, y0, x1, y1) {
    const dx = cx - Math.max(x0, Math.min(cx, x1)), dy = cy - Math.max(y0, Math.min(cy, y1));
    return dx * dx + dy * dy < r * r;
  }

  // Returns { hit, scored } for this frame.
  function step(g, flap) {
    if (!g.alive) return { hit: false, scored: false };
    g.prevY = g.y;
    // As in the original, the head may rise above the screen but cannot flap there.
    if (flap && g.y - C.BIRD_R >= 0) g.vy = C.FLAP_VY;
    g.vy = Math.min(g.vy + C.GRAVITY, C.MAX_FALL);
    g.y += g.vy;
    g.t += 1;
    for (const gate of g.gates) gate.x -= C.SPEED;

    let hit = g.y + C.BIRD_R > C.HEIGHT;
    for (const gate of g.gates) {
      const x1 = gate.x + C.GATE_W, top = gate.gap - C.GATE_GAP / 2, bot = gate.gap + C.GATE_GAP / 2;
      if (circleHitsRect(C.BIRD_X, g.y, C.BIRD_R, gate.x, -Infinity, x1, top) ||
          circleHitsRect(C.BIRD_X, g.y, C.BIRD_R, gate.x, bot, x1, Infinity)) hit = true;
    }
    if (hit) {
      g.alive = false;
      return { hit: true, scored: false };
    }
    let scored = false;
    // The point lands as the pipe's front edge reaches the head, like the original.
    for (const gate of g.gates) {
      if (!gate.passed && gate.x <= C.BIRD_X - C.BIRD_R) {
        gate.passed = true;
        g.score += 1;
        scored = true;
      }
    }
    while (g.gates.length && g.gates[0].x + C.GATE_W < -C.WIDTH) g.gates.shift();
    while (g.gates.length < 5) {
      const last = g.gates[g.gates.length - 1];
      g.gates.push({ x: last.x + C.GATE_SPACING, gap: g.nextGap(), passed: false });
    }
    return { hit: false, scored };
  }

  root.Glowhop = { C, mulberry32, randomGaps, createGame, step, upcoming };
})(typeof window !== "undefined" ? window : globalThis);
