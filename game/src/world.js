// world.js — the Laut Biru island chain: procedural ocean, islands, clouds and
// the runway island, all scrolling downward. Deterministic from a seeded RNG.
import { mulberry32, clamp, TAU } from './rng.js';

const SEA_DEEP = '#0b5e7a';
const SEA_SHALLOW = '#128a9c';
const SAND = '#d9b380';
const GRASS = '#4d8a3f';
const FOREST = '#2f6b2e';
const ROCK = '#8a6f5c';

// A blob island: cluster of circles making a natural coastline.
function makeIsland(rng, x, wy, r) {
  const blobs = [];
  const n = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU;
    const d = rng() * r * 0.45;
    blobs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8, r: r * (0.42 + rng() * 0.35) });
  }
  // Forest speckles and rocks.
  const trees = [];
  for (let i = 0; i < r * 0.9; i++) {
    const a = rng() * TAU, d = rng() * r * 0.55;
    trees.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7, r: 2 + rng() * 3.5 });
  }
  const rocks = [];
  for (let i = 0; i < 4; i++) {
    const a = rng() * TAU, d = r * (0.6 + rng() * 0.3);
    rocks.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7, r: 3 + rng() * 4 });
  }
  return { kind: 'island', x, wy, r, blobs, trees, rocks, seed: rng() * 100 };
}

function makeRunwayIsland(x, wy) {
  // Long island with a vertical runway strip down its spine.
  const isl = makeIsland(mulberry32(99), x, wy, 150);
  isl.kind = 'runway';
  isl.r = 150;
  isl.runway = { x, w: 46 };
  return isl;
}

function makeCloud(rng, x, wy) {
  const puffs = [];
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    puffs.push({ dx: (i - n / 2) * 26 + (rng() - 0.5) * 14, dy: (rng() - 0.5) * 12, r: 16 + rng() * 18 });
  }
  return { kind: 'cloud', x, wy, puffs, alpha: 0.75 + rng() * 0.2, drift: 6 + rng() * 10 };
}

export function addIsland(world, x, wy, r) {
  world.features.push(makeIsland(world.rng, x, wy, r));
}
export function addCloud(world, x, wy) {
  world.features.push(makeCloud(world.rng, x, wy));
}

export function createWorld(W, seed = 7) {
  const rng = mulberry32(seed);
  const features = [];
  // The runway island anchors the start: its centre sits ~1 screen above the
  // playfield so the takeoff rolls down into view.
  features.push(makeRunwayIsland(W / 2, -260));
  let nextY = -900;
  const sparkles = [];
  for (let i = 0; i < 90; i++) {
    sparkles.push({ x: rng() * W, y: rng() * 720, ph: rng() * TAU, s: 0.5 + rng() * 1.5 });
  }
  return { W, rng, features, nextY, sparkles, scrollY: 0 };
}

function genAhead(world, scrollY, H, topH) {
  // scrollY decreases over time (world scrolls downward on screen);
  // features are generated until 1.5 screens above the current top edge.
  while (world.nextY > scrollY - H * 1.5) {
    const r = world.rng;
    const roll = r();
    const y = world.nextY;
    if (roll < 0.34) {
      const x = 90 + r() * (world.W - 180);
      world.features.push(makeIsland(r, x, y, 55 + r() * 90));
      world.nextY -= 380 + r() * 320;
    } else if (roll < 0.62) {
      const x = 60 + r() * (world.W - 120);
      world.features.push(makeCloud(r, x, y));
      world.nextY -= 200 + r() * 220;
    } else if (roll < 0.8) {
      // Island pair (small + tiny islet).
      const x = 110 + r() * (world.W - 220);
      world.features.push(makeIsland(r, x, y, 45 + r() * 50));
      world.features.push(makeIsland(r, clamp(x + (r() - 0.5) * 320, 70, world.W - 70), y - 140, 26 + r() * 22));
      world.nextY -= 420 + r() * 300;
    } else {
      // Open sea stretch (breathing room, sometimes a lone cloud).
      if (r() < 0.5) world.features.push(makeCloud(r, 60 + r() * (world.W - 120), y));
      world.nextY -= 300 + r() * 200;
    }
  }
  // Drop features far below the screen (oldest = southernmost = first out).
  while (world.features.length && world.features[0].wy - scrollY + topH > H + 500) world.features.shift();
}

function drawIsland(ctx, f, sy) {
  const cx = f.x, cy = sy;
  // Sand base (union of circles).
  ctx.fillStyle = SAND;
  for (const b of f.blobs) { ctx.beginPath(); ctx.arc(cx + b.dx, cy + b.dy, b.r, 0, TAU); ctx.fill(); }
  // Shallow-water halo.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
  for (const b of f.blobs) { ctx.beginPath(); ctx.arc(cx + b.dx, cy + b.dy, b.r + 4, 0, TAU); ctx.stroke(); }
  // Grass interior.
  ctx.fillStyle = GRASS;
  for (const b of f.blobs) { ctx.beginPath(); ctx.arc(cx + b.dx, cy + b.dy, b.r * 0.72, 0, TAU); ctx.fill(); }
  // Forest speckles.
  ctx.fillStyle = FOREST;
  for (const tr of f.trees) { ctx.beginPath(); ctx.arc(cx + tr.dx, cy + tr.dy, tr.r, 0, TAU); ctx.fill(); }
  // Rocks.
  ctx.fillStyle = ROCK;
  for (const rk of f.rocks) { ctx.beginPath(); ctx.arc(cx + rk.dx, cy + rk.dy, rk.r, 0, TAU); ctx.fill(); }
  if (f.kind === 'runway') drawRunway(ctx, f, sy);
}

function drawRunway(ctx, f, sy) {
  const rx = f.runway.x, w = f.runway.w;
  const top = sy - 190, bottom = sy + 210;
  // Asphalt strip.
  ctx.fillStyle = '#3a4048';
  ctx.fillRect(rx - w / 2, top, w, bottom - top);
  ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 2;
  ctx.strokeRect(rx - w / 2, top, w, bottom - top);
  // Centre dashes.
  ctx.fillStyle = '#f2f2f2';
  for (let y = top + 14; y < bottom - 14; y += 34) ctx.fillRect(rx - 2, y, 4, 18);
  // Threshold bars.
  ctx.fillStyle = '#f2f2f2';
  for (let i = -2; i <= 2; i++) ctx.fillRect(rx + i * 9 - 3, top + 8, 6, 12);
  for (let i = -2; i <= 2; i++) ctx.fillRect(rx + i * 9 - 3, bottom - 20, 6, 12);
  // Runway number.
  ctx.fillStyle = '#f2f2f2'; ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('07', rx, top + 52);
  // Taxiway + hangar on the island's shoulder.
  ctx.fillStyle = '#3a4048'; ctx.fillRect(rx + w / 2, sy + 40, 60, 14);
  ctx.fillStyle = '#8a4a2f';
  ctx.beginPath(); ctx.arc(rx + w / 2 + 78, sy + 47, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9a06a'; ctx.fillRect(rx + w / 2 + 64, sy + 40, 28, 14);
  // Windsock.
  ctx.strokeStyle = '#5c3405'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(rx - w / 2 - 16, sy + 90); ctx.lineTo(rx - w / 2 - 16, sy + 66); ctx.stroke();
  ctx.fillStyle = '#ff7b1c';
  ctx.beginPath(); ctx.moveTo(rx - w / 2 - 16, sy + 66); ctx.lineTo(rx - w / 2 + 2, sy + 70); ctx.lineTo(rx - w / 2 - 16, sy + 74); ctx.closePath(); ctx.fill();
}

function drawCloud(ctx, f, sy, t) {
  ctx.save();
  ctx.globalAlpha = f.alpha * 0.9;
  ctx.fillStyle = '#ffffff';
  for (const p of f.puffs) {
    ctx.beginPath(); ctx.ellipse(f.x + p.dx, sy + p.dy, p.r, p.r * 0.55, 0, 0, TAU); ctx.fill();
  }
  // Soft grey underside.
  ctx.globalAlpha = f.alpha * 0.25;
  ctx.fillStyle = '#8aa0b8';
  for (const p of f.puffs) {
    ctx.beginPath(); ctx.ellipse(f.x + p.dx, sy + p.dy + p.r * 0.3, p.r * 0.9, p.r * 0.3, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export function drawWorld(ctx, world, scrollY, W, H, topH, t) {
  genAhead(world, scrollY, H, topH);
  // Ocean gradient + slow swell bands.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, SEA_DEEP);
  g.addColorStop(0.5, SEA_SHALLOW);
  g.addColorStop(1, SEA_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Moving swell lines (drift downward with the scroll).
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = ((i * 97 - scrollY * 0.55) % (H + 120)) - 60;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.01 + i * 2 + t * 0.4) * 5);
    ctx.stroke();
  }
  // Sun sparkles on the water (drift downward with the scroll).
  for (const s of world.sparkles) {
    const y = ((s.y - scrollY * 0.9) % (H + 40)) - 20;
    const a = 0.10 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2 + s.ph));
    ctx.fillStyle = `rgba(255,240,180,${a})`;
    ctx.fillRect(s.x, y, s.s * 3, 1.6);
  }
  // Islands (below clouds, above sea).
  for (const f of world.features) {
    if (f.kind === 'cloud') continue;
    const sy = f.wy - scrollY + topH;
    if (sy < -320 || sy > H + 320) continue;
    drawIsland(ctx, f, sy);
  }
  // Clouds drift over everything in the sky layer.
  for (const f of world.features) {
    if (f.kind !== 'cloud') continue;
    const sy = f.wy - scrollY + topH + Math.sin(t * 0.3 + f.wy) * 4;
    if (sy < -160 || sy > H + 160) continue;
    drawCloud(ctx, f, sy, t);
  }
}
