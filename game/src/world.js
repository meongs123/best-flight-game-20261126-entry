// world.js — the Laut Biru island chain: procedural ocean, islands, clouds and
// the runway island, all scrolling downward. Deterministic from a seeded RNG.
import { mulberry32, clamp, TAU } from './rng.js';

const SEA_DEEP = '#0c5a70';
const SEA_SHALLOW = '#178f88';
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
    // 20% of trees are palms (trunk + fronds at draw time).
    trees.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7, r: 2 + rng() * 3.5, palm: rng() < 0.2 });
  }
  const rocks = [];
  for (let i = 0; i < 4; i++) {
    const a = rng() * TAU, d = r * (0.6 + rng() * 0.3);
    rocks.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7, r: 3 + rng() * 4 });
  }
  // Buildings on larger islands (0–4 small huts).
  const buildings = [];
  if (r > 80) {
    const nB = Math.floor(rng() * 5);
    for (let i = 0; i < nB; i++) {
      const a = rng() * TAU, d = rng() * r * 0.45;
      buildings.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7, w: 8 + rng() * 6, h: 7 + rng() * 6, color: ['#c9a06a', '#8a4a2f', '#e8e0cc'][Math.floor(rng() * 3)] });
    }
  }
  // River on the largest islands (wavy light-blue meander).
  let river = null;
  if (r > 100) {
    river = [];
    for (let i = 0; i < 5; i++) river.push({ dx: -r * 0.6 + (i / 4) * r * 1.2, dy: Math.sin(i * 1.3) * r * 0.25 });
  }
  // Road on big islands (tan strip from one edge toward the centre).
  let road = null;
  if (r > 90) road = { ang: rng() * TAU, len: r * 0.9 };
  return { kind: 'island', x, wy, r, blobs, trees, rocks, seed: rng() * 100, buildings, river, road };
}

function makeRunwayIsland(x, wy) {
  // Long island with a vertical runway strip down its spine.
  const isl = makeIsland(mulberry32(99), x, wy, 150);
  isl.kind = 'runway';
  isl.r = 150;
  isl.runway = { x, w: 46 };
  // Keep the strip clear: no buildings, river or road on the airfield.
  isl.buildings = []; isl.river = null; isl.road = null;
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

// A boat/ship sailing the open sea: dark hull, white cabin, bobbing on a seed.
function makeBoat(rng, x, wy) {
  return { kind: 'boat', x, wy, bobPh: rng() * TAU };
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
  // 30 more sparkles near the sun-glow quadrant (upper right).
  for (let i = 0; i < 30; i++) {
    sparkles.push({ x: W * 0.6 + rng() * W * 0.4, y: rng() * 720, ph: rng() * TAU, s: 0.5 + rng() * 1.5 });
  }
  // High-cloud parallax layer: pre-generated, slow 0.45x scroll, no shadow.
  const highClouds = [];
  for (let i = 0; i < 10; i++) {
    const c = makeCloud(rng, rng() * W, -6000 + i * 600 + rng() * 200);
    c.scale = 1.6 + rng() * 0.6;
    c.alpha *= 0.5;
    highClouds.push(c);
  }
  return { W, rng, features, nextY, sparkles, scrollY: 0, highClouds };
}

function genAhead(world, scrollY, H, topH) {
  // scrollY decreases over time (world scrolls downward on screen);
  // features are generated until 1.5 screens above the current top edge.
  while (world.nextY > scrollY - H * 1.5) {
    const r = world.rng;
    const roll = r();
    const y = world.nextY;
    if (roll < 0.42) {
      const x = 90 + r() * (world.W - 180);
      world.features.push(makeIsland(r, x, y, 55 + r() * 90));
      world.nextY -= 320 + r() * 280;
    } else if (roll < 0.62) {
      const x = 60 + r() * (world.W - 120);
      world.features.push(makeCloud(r, x, y));
      world.nextY -= 200 + r() * 220;
    } else if (roll < 0.8) {
      // Island pair (small + tiny islet).
      const x = 110 + r() * (world.W - 220);
      world.features.push(makeIsland(r, x, y, 45 + r() * 50));
      world.features.push(makeIsland(r, clamp(x + (r() - 0.5) * 320, 70, world.W - 70), y - 140, 26 + r() * 22));
      world.nextY -= 360 + r() * 260;
    } else if (roll < 0.88) {
      // Boat/ship with a wake, sailing the open sea.
      const x = 90 + r() * (world.W - 180);
      world.features.push(makeBoat(r, x, y));
      world.nextY -= 300 + r() * 200;
    } else {
      // Open sea stretch (breathing room, sometimes a lone cloud).
      if (r() < 0.65) world.features.push(makeCloud(r, 60 + r() * (world.W - 120), y));
      world.nextY -= 300 + r() * 200;
    }
  }
  // Drop features far below the screen (oldest = southernmost = first out).
  while (world.features.length && world.features[0].wy - scrollY + topH > H + 500) world.features.shift();
}

function drawIsland(ctx, f, sy, t) {
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
  // River (light-blue meander across big islands).
  if (f.river) {
    ctx.strokeStyle = '#7ec8e3'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    f.river.forEach((p, i) => { if (i === 0) ctx.moveTo(cx + p.dx, cy + p.dy); else ctx.lineTo(cx + p.dx, cy + p.dy); });
    ctx.stroke();
  }
  // Road (tan strip from one edge toward the centre).
  if (f.road) {
    ctx.strokeStyle = '#d9c49a'; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(f.road.ang) * f.r * 0.7, cy + Math.sin(f.road.ang) * f.r * 0.7);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }
  // Trees, swaying gently (palms draw trunk + fronds).
  for (let i = 0; i < f.trees.length; i++) {
    const tr = f.trees[i];
    const sway = Math.sin(t * 0.8 + f.seed + i) * 1.2;
    if (tr.palm) {
      ctx.strokeStyle = '#5c3405'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + tr.dx + sway, cy + tr.dy); ctx.lineTo(cx + tr.dx + sway, cy + tr.dy - 7); ctx.stroke();
      ctx.strokeStyle = FOREST; ctx.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.5;
        ctx.beginPath(); ctx.moveTo(cx + tr.dx + sway, cy + tr.dy - 7);
        ctx.quadraticCurveTo(cx + tr.dx + sway + Math.cos(a) * 5, cy + tr.dy - 7 + Math.sin(a) * 5, cx + tr.dx + sway + Math.cos(a) * 8, cy + tr.dy - 7 + Math.sin(a) * 8 + 3);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = FOREST;
      ctx.beginPath(); ctx.arc(cx + tr.dx + sway, cy + tr.dy, tr.r, 0, TAU); ctx.fill();
    }
  }
  // Buildings (small huts with pitched roofs).
  for (const b of f.buildings || []) {
    ctx.fillStyle = b.color;
    ctx.fillRect(cx + b.dx - b.w / 2, cy + b.dy - b.h, b.w, b.h);
    ctx.fillStyle = '#5c3405';
    ctx.beginPath(); ctx.moveTo(cx + b.dx - b.w / 2, cy + b.dy - b.h); ctx.lineTo(cx + b.dx, cy + b.dy - b.h - 5); ctx.lineTo(cx + b.dx + b.w / 2, cy + b.dy - b.h); ctx.closePath(); ctx.fill();
  }
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

function drawBoat(ctx, f, sy, t) {
  const y = sy + Math.sin(t * 1.2 + f.bobPh) * 2;
  // Wake.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(f.x - 14, y + 8); ctx.lineTo(f.x - 24, y + 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(f.x + 14, y + 8); ctx.lineTo(f.x + 24, y + 18); ctx.stroke();
  // Dark hull + white cabin.
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath(); ctx.moveTo(f.x - 16, y); ctx.lineTo(f.x + 16, y); ctx.lineTo(f.x + 10, y + 8); ctx.lineTo(f.x - 10, y + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2e8d5'; ctx.fillRect(f.x - 6, y - 7, 12, 7);
}

function drawCloud(ctx, f, sy, t, sx, noShadow) {
  const x = sx !== undefined ? sx : f.x;
  const sc = f.scale || 1;
  ctx.save();
  // Soft shadow cast on the water below the cloud (sun low, upper right).
  // High and foreground clouds cast no visible shadow.
  if (!noShadow) {
    ctx.fillStyle = 'rgba(10,35,45,0.20)';
    for (const p of f.puffs) {
      ctx.beginPath(); ctx.ellipse(x + p.dx * sc - 26, sy + p.dy * sc + 38, p.r * sc * 1.05, p.r * sc * 0.5, 0, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = f.alpha * 0.9;
  ctx.fillStyle = '#fff6e0';
  for (const p of f.puffs) {
    ctx.beginPath(); ctx.ellipse(x + p.dx * sc, sy + p.dy * sc, p.r * sc, p.r * sc * 0.55, 0, 0, TAU); ctx.fill();
  }
  // Warm golden-hour underside.
  ctx.globalAlpha = f.alpha * 0.30;
  ctx.fillStyle = '#c98d5a';
  for (const p of f.puffs) {
    ctx.beginPath(); ctx.ellipse(x + p.dx * sc, sy + p.dy * sc + p.r * sc * 0.3, p.r * sc * 0.9, p.r * sc * 0.3, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Two large soft foreground clouds drifting across the upper/mid frame.
// Deterministic from t; alpha <= 0.3; y-bands keep them clear of both HUD bars
// (top edge stays below the top bar, bottom edge above the instrument strip).
export function drawForegroundClouds(ctx, world, t, W, H) {
  const mk = (x, y) => ({
    kind: 'cloud', x, wy: 0,
    puffs: [
      { dx: -40, dy: 0, r: 34 }, { dx: 0, dy: -8, r: 42 }, { dx: 44, dy: 2, r: 36 },
      { dx: -14, dy: 10, r: 30 }, { dx: 20, dy: 12, r: 28 },
    ],
    alpha: 0.28, drift: 0, scale: 2.5,
  });
  const c1x = ((t * 18 + 300) % (W + 400)) - 200;
  const c1y = 200 + Math.sin(t * 0.2) * 25;
  const c2x = ((t * 14 + 200) % (W + 400)) - 200;
  const c2y = H * 0.55 + Math.sin(t * 0.17 + 1) * 20;
  drawCloud(ctx, mk(c1x, c1y), c1y, t, c1x, true);
  drawCloud(ctx, mk(c2x, c2y), c2y, t, c2x, true);
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
  // Golden-hour sun glow over the sea (upper right, low sun).
  const sun = ctx.createRadialGradient(W * 0.85, 20, 20, W * 0.85, 20, 560);
  sun.addColorStop(0, 'rgba(255,200,110,0.28)');
  sun.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = sun;
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
  // High-cloud parallax layer (0.45x scroll — slower, farther away).
  for (const f of world.highClouds || []) {
    const sy = f.wy - scrollY * 0.45 + topH;
    if (sy < -220 || sy > H + 220) continue;
    drawCloud(ctx, f, sy, t, f.x, true);
  }
  // Islands and boats (below clouds, above sea).
  for (const f of world.features) {
    if (f.kind === 'cloud') continue;
    const sy = f.wy - scrollY + topH;
    if (sy < -320 || sy > H + 320) continue;
    if (f.kind === 'boat') { drawBoat(ctx, f, sy, t); continue; }
    drawIsland(ctx, f, sy, t);
  }
  // Foam whitecaps hugging island shores.
  for (const f of world.features) {
    if (f.kind === 'cloud' || f.kind === 'boat') continue;
    const sy = f.wy - scrollY + topH;
    if (sy < -320 || sy > H + 320) continue;
    const a = 0.25 + 0.15 * Math.sin(t * 1.5 + f.seed);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(f.x, sy, f.r + 8, -0.3, 1.2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.7})`;
    ctx.beginPath(); ctx.arc(f.x, sy, f.r + 14, 2.2, 3.6); ctx.stroke();
  }
  // Clouds drift over everything in the sky layer (slow sideways sway).
  for (const f of world.features) {
    if (f.kind !== 'cloud') continue;
    const sy = f.wy - scrollY + topH + Math.sin(t * 0.3 + f.wy) * 4;
    if (sy < -160 || sy > H + 160) continue;
    const sx = f.x + Math.sin(t * 0.1 + f.wy * 0.01) * f.drift * 4;
    drawCloud(ctx, f, sy, t, sx);
  }
}
