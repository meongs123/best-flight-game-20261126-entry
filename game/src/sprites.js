// sprites.js — every sprite is drawn in code with canvas vector paths.
// 100% original art: no copied pixels, no image files. All craft point UP (-y),
// except the diving scout/fighter/weaver, which point DOWN (+y) toward the player.
// WWII propeller-fighter style: camo paint, roundels, spinning prop blur discs,
// panel lines, engine detail. No borrowed text, logos, or artwork.
import { TAU } from './rng.js';

function poly(ctx, pts, fill, stroke, lw = 1.5) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// 5-point star, used inside allied roundels.
function star5(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}

// Allied roundel: dark blue disc, thin white ring, white star.
function starRoundel(ctx, x, y, r) {
  ctx.fillStyle = '#1d3a5f'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#e8f0f8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  star5(ctx, x, y, r * 0.82, '#f4f8fc');
}

// Hostile roundel: red disc, cream centre.
function redRoundel(ctx, x, y, r) {
  ctx.fillStyle = '#b02a20'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f2e8d5'; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, TAU); ctx.fill();
}

// Spinning propeller: translucent blur disc + two faint blades rotating with
// t (deterministic — driven by game time, never wall-clock or Math.random).
function propDisc(ctx, x, y, r, t, phase = 0) {
  ctx.fillStyle = 'rgba(205,215,225,0.30)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(235,242,248,0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.stroke();
  const a = t * 16 + phase;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(40,48,58,0.35)';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.55, 1.6, r * 0.55, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, r * 0.55, 1.6, r * 0.55, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // Spinner hub.
  ctx.fillStyle = '#2c343c'; ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, TAU); ctx.fill();
}

// ---- Player: the Kelana-9 interceptor, rebuilt as a WWII prop fighter ----
// Sea-blue Corsair-style single-engine fighter: spinning prop, camo blotches,
// star roundels, glass canopy, exhaust stubs. Solid parts keep the old extents
// (x ±30, y -26..+24); only the translucent prop blur reaches ~3 units past
// the old nose tip (visual only — collision radius and anchor unchanged).
export function drawPlayer(ctx, x, y, bank, t, shield, thrust) {
  ctx.save();
  ctx.translate(x, y);
  // Stronger bank + a subtle roll wobble so the plane never looks frozen.
  ctx.rotate(bank * 0.5 + Math.sin(t * 2.2) * 0.03);
  // 1.5x sprite: the player must read at thumbnail size.
  ctx.scale(1.5, 1.5);
  // Spinning prop blur at the nose (ahead of the spinner).
  propDisc(ctx, 0, -21, 8, t, 0);
  // Engine cowling: rounded nose cone + ring.
  poly(ctx, [[0, -26], [4.5, -20], [5, -12], [-5, -12], [-4.5, -20]], '#22394f', '#12222f');
  ctx.strokeStyle = '#4a6a86'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, -21, 4.6, 0, TAU); ctx.stroke();
  // Exhaust stubs + flicker when the throttle is up.
  for (const sx of [-5.5, 5.5]) {
    ctx.fillStyle = '#3a4048'; ctx.fillRect(sx - 1.4, -9, 2.8, 4);
    if (thrust > 0.05) {
      const f = 2 + Math.sin(t * 34 + sx) * 1.2 + thrust * 2;
      ctx.fillStyle = 'rgba(255,150,40,0.85)';
      ctx.beginPath(); ctx.moveTo(sx - 1.6, -5); ctx.lineTo(sx + 1.6, -5); ctx.lineTo(sx, -5 + f); ctx.closePath(); ctx.fill();
    }
  }
  // Swept main wings (sea blue, darker leading edge, star roundels).
  poly(ctx, [[-30, 4], [-10, -5], [-6, 2], [-24, 13]], '#2b4f74', '#16283c');
  poly(ctx, [[30, 4], [10, -5], [6, 2], [24, 13]], '#2b4f74', '#16283c');
  ctx.strokeStyle = '#1a3248'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-28, 3); ctx.lineTo(-9, -3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, 3); ctx.lineTo(9, -3); ctx.stroke();
  starRoundel(ctx, -19, 4, 4.2);
  starRoundel(ctx, 19, 4, 4.2);
  // Wingtip lights.
  ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(-30, 6, 2.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2aff66'; ctx.beginPath(); ctx.arc(30, 6, 2.4, 0, TAU); ctx.fill();
  // Wing guns (small bumps under the wings).
  for (const sx of [-14, -10, 10, 14]) {
    ctx.fillStyle = '#16283c'; ctx.fillRect(sx - 1, 6, 2, 4);
  }
  // Tail: horizontal stabilizers + edge-on vertical fin.
  poly(ctx, [[-14, 14], [-4, 12], [-4, 18], [-15, 21]], '#2b4f74', '#16283c');
  poly(ctx, [[14, 14], [4, 12], [4, 18], [15, 21]], '#2b4f74', '#16283c');
  ctx.strokeStyle = '#16283c'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, 24); ctx.stroke();
  // Fuselage: tapered sea-blue body with olive camo blotches + panel lines.
  poly(ctx, [[0, -24], [4.5, -12], [5.5, 8], [4, 20], [-4, 20], [-5.5, 8], [-4.5, -12]], '#2b4f74', '#16283c');
  ctx.fillStyle = 'rgba(74,90,58,0.85)';
  ctx.beginPath(); ctx.ellipse(-2.5, -2, 2.4, 5, 0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2.8, 10, 2, 4, -0.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(22,40,60,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.lineTo(4.5, 0); ctx.stroke();
  // Canopy (glowing glass).
  const cg = ctx.createLinearGradient(0, -16, 0, 0);
  cg.addColorStop(0, '#bfe8ff'); cg.addColorStop(1, '#2a6ea8');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.ellipse(0, -8, 3.4, 7.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-1.5, -13); ctx.lineTo(1, -4); ctx.stroke();
  // Shield bubble.
  if (shield > 0) {
    ctx.strokeStyle = `rgba(90,200,255,${0.5 + 0.3 * Math.sin(t * 6)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(90,200,255,0.08)';
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---- Enemies ----
// Scout: slim silver-grey dart diving nose-DOWN (+y). Prop at the nose.
export function drawScout(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  // Spinning prop at the nose (bottom).
  propDisc(ctx, 0, 12, 6, t, 1.3);
  // Swept wings.
  poly(ctx, [[-14, 8], [-4, -4], [-2, 4], [-10, 10]], '#9aa4ab', '#4a545c');
  poly(ctx, [[14, 8], [4, -4], [2, 4], [10, 10]], '#9aa4ab', '#4a545c');
  // Slim fuselage, nose down.
  poly(ctx, [[0, 14], [3.5, 4], [3, -6], [-3, -6], [-3.5, 4]], '#c3c9ce', '#4a545c');
  // Red nose band + spinner.
  poly(ctx, [[0, 14], [3, 8], [-3, 8]], '#b02a20');
  // Canopy dot.
  ctx.fillStyle = '#2a6ea8'; ctx.beginPath(); ctx.arc(0, 1, 2.2, 0, TAU); ctx.fill();
  // Tail fins (top).
  poly(ctx, [[-4, -6], [-7, -10], [-3, -9]], '#9aa4ab', '#4a545c');
  poly(ctx, [[4, -6], [7, -10], [3, -9]], '#9aa4ab', '#4a545c');
  ctx.restore();
}
// Fighter: rust-red camo mid fighter diving nose-DOWN (+y).
export function drawFighter(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  // Spinning prop at the nose (bottom).
  propDisc(ctx, 0, 14, 8, t, 2.1);
  // Wings with red roundels.
  poly(ctx, [[-24, -2], [-8, 4], [-6, -6], [-4, 12], [4, 12], [6, -6], [8, 4], [24, -2], [10, -10], [0, -14], [-10, -10]], '#8a2f1d', '#4a0f0a');
  redRoundel(ctx, -15, -2, 3.5);
  redRoundel(ctx, 15, -2, 3.5);
  ctx.strokeStyle = 'rgba(74,15,10,0.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-22, -2); ctx.lineTo(-8, 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22, -2); ctx.lineTo(8, 3); ctx.stroke();
  // Fuselage, nose down.
  poly(ctx, [[0, 16], [4.5, 6], [5, -6], [-5, -6], [-4.5, 6]], '#a3271e', '#4a0f0a');
  ctx.fillStyle = 'rgba(92,31,18,0.9)';
  ctx.beginPath(); ctx.ellipse(-2, 0, 1.8, 4, 0.3, 0, TAU); ctx.fill();
  // Canopy (glowing).
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(0, -2, 3, 0, TAU); ctx.fill();
  // Wingtip lights.
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(-22, -2, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(22, -2, 1.8, 0, TAU); ctx.fill();
  ctx.restore();
}
// Weaver: mustard-orange dart diving nose-DOWN (+y), wobbles as before.
export function drawWeaver(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3) * 0.15);
  // Spinning prop at the nose (bottom).
  propDisc(ctx, 0, 13, 6.5, t, 0.7);
  // Swept-back wings.
  poly(ctx, [[0, 16], [16, -8], [6, -10], [0, -4], [-6, -10], [-16, -8]], '#d88f1a', '#6b3405');
  ctx.strokeStyle = 'rgba(107,52,5,0.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-4, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(4, -2); ctx.stroke();
  // Fuselage, nose down, yellow nose band.
  poly(ctx, [[0, 16], [5, 2], [0, -6], [-5, 2]], '#8a4a2f');
  poly(ctx, [[0, 16], [3.4, 9], [-3.4, 9]], '#ffd23e');
  ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}
// Bomber: olive-drab twin-engine heavy bomber, nose UP (-y, same as before).
// Two prop discs on the wing leading edge, glass nose, turrets, roundels.
export function drawBomber(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  // Engine nacelles (rounded pods on the wing).
  for (const sx of [-20, 20]) {
    ctx.fillStyle = '#5c6b4a';
    ctx.beginPath(); ctx.ellipse(sx, -2, 5.5, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2c3620'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(sx, -2, 5.5, 9, 0, 0, TAU); ctx.stroke();
  }
  // Twin props (spinning blur discs) ahead of the nacelles.
  propDisc(ctx, -20, -2, 9, t, 0);
  propDisc(ctx, 20, -2, 9, t, Math.PI);
  // Wings with panel lines + roundels.
  poly(ctx, [[-38, -4], [-6, -10], [-4, 0], [-38, 6]], '#5c6b4a', '#2c3620');
  poly(ctx, [[38, -4], [6, -10], [4, 0], [38, 6]], '#5c6b4a', '#2c3620');
  ctx.strokeStyle = 'rgba(44,54,32,0.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-36, -2); ctx.lineTo(-8, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(36, -2); ctx.lineTo(8, -6); ctx.stroke();
  redRoundel(ctx, -22, 0, 3.4);
  redRoundel(ctx, 22, 0, 3.4);
  // Fuselage with camo blotches + panel lines.
  poly(ctx, [[0, -18], [8, -8], [9, 12], [6, 22], [-6, 22], [-9, 12], [-8, -8]], '#7a8a5a', '#2c3620');
  ctx.fillStyle = 'rgba(92,107,74,0.9)';
  ctx.beginPath(); ctx.ellipse(-4, 2, 3, 6, 0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4.5, 12, 2.4, 4, -0.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(44,54,32,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 20); ctx.stroke();
  // Glass nose (blue gradient) at the front (top).
  const ng = ctx.createLinearGradient(0, -18, 0, -8);
  ng.addColorStop(0, '#bfe8ff'); ng.addColorStop(1, '#2a6ea8');
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.ellipse(0, -13, 4.5, 5, 0, 0, TAU); ctx.fill();
  // Dorsal turret + tail fins.
  ctx.fillStyle = '#2c3620'; ctx.beginPath(); ctx.arc(0, 2, 3.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5c6b4a';
  poly(ctx, [[-10, 20], [-16, 30], [-8, 28]], '#5c6b4a', '#2c3620');
  poly(ctx, [[10, 20], [16, 30], [8, 28]], '#5c6b4a', '#2c3620');
  ctx.restore();
}
// Gunboat: a WWII patrol warship (it sits on the water — a boat, not a plane).
// Detailed grey-camo hull, two turrets (front one rotates as before), stack, wake.
export function drawGunboat(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  // Wake.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-14, 24); ctx.moveTo(8, 12); ctx.lineTo(14, 24); ctx.stroke();
  // Hull (bow up, stern down) with camo blotches.
  poly(ctx, [[0, -14], [7, -6], [9, 10], [5, 16], [-5, 16], [-9, 10], [-7, -6]], '#5a636b', '#2c313a');
  ctx.fillStyle = 'rgba(58,64,72,0.9)';
  ctx.beginPath(); ctx.ellipse(-3, 2, 2.5, 5, 0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.5, 9, 2, 3.5, -0.3, 0, TAU); ctx.fill();
  // Deck + bridge.
  ctx.fillStyle = '#7d8891'; ctx.fillRect(-4, -8, 8, 12);
  ctx.fillStyle = '#9aa4ab'; ctx.fillRect(-3, -12, 6, 5);
  // Smokestack.
  ctx.fillStyle = '#3a4048'; ctx.fillRect(-2, 4, 4, 5);
  ctx.fillStyle = '#6b7280'; ctx.fillRect(-2, 4, 4, 1.5);
  // Rear turret (fixed).
  ctx.fillStyle = '#3a4048'; ctx.beginPath(); ctx.arc(0, 12, 3.5, 0, TAU); ctx.fill();
  ctx.fillRect(-1, 12, 2, 5);
  // Front turret (rotates slowly, as before).
  ctx.save(); ctx.translate(0, -2); ctx.rotate(Math.sin(t * 0.8) * 0.5);
  ctx.fillStyle = '#3a4048'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
  ctx.fillRect(-1, -12, 2, 12);
  ctx.restore();
  ctx.restore();
}
// ---- Boss: the Benteng Terbang flying fortress, rebuilt as a huge
// multi-engine bomber (nose UP, as before). Four props, turrets, camo,
// roundels, battle damage. Extents unchanged: x ±96, y -34..+44.
export function drawBoss(ctx, x, y, t, hpFrac) {
  ctx.save(); ctx.translate(x, y);
  // Engine nacelles (four rounded pods on the wing).
  for (const sx of [-58, -20, 20, 58]) {
    ctx.fillStyle = '#4a3a2c';
    ctx.beginPath(); ctx.ellipse(sx, -6, 6.5, 10, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#200f0f'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(sx, -6, 6.5, 10, 0, 0, TAU); ctx.stroke();
  }
  // Four prop blur discs.
  propDisc(ctx, -58, -6, 11, t, 0);
  propDisc(ctx, -20, -6, 11, t, Math.PI / 2);
  propDisc(ctx, 20, -6, 11, t, Math.PI);
  propDisc(ctx, 58, -6, 11, t, Math.PI * 1.5);
  // Main wing with panel lines + gold trim + roundels.
  poly(ctx, [[-96, -8], [-10, -18], [-8, 2], [-96, 10]], '#4a2c2c', '#200f0f');
  poly(ctx, [[96, -8], [10, -18], [8, 2], [96, 10]], '#4a2c2c', '#200f0f');
  ctx.strokeStyle = 'rgba(32,15,15,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-92, -5); ctx.lineTo(-12, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(92, -5); ctx.lineTo(12, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-92, 6); ctx.lineTo(-12, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(92, 6); ctx.lineTo(12, -1); ctx.stroke();
  // Gold trim.
  ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-96, -4); ctx.lineTo(-10, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(96, -4); ctx.lineTo(10, -14); ctx.stroke();
  redRoundel(ctx, -72, -2, 6);
  redRoundel(ctx, 72, -2, 6);
  // Hull with camo blotches + panel lines.
  poly(ctx, [[0, -34], [16, -18], [18, 22], [10, 44], [-10, 44], [-18, 22], [-16, -18]], '#6b2a20', '#200f0f');
  ctx.fillStyle = 'rgba(107,90,66,0.85)';
  ctx.beginPath(); ctx.ellipse(-8, -2, 5, 10, 0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, 16, 4, 8, -0.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(32,15,15,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(14, -10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, 14); ctx.lineTo(16, 14); ctx.stroke();
  poly(ctx, [[0, -34], [8, -18], [8, 22], [-8, 22], [-8, -18]], '#8a3a2c');
  // Glass nose (front, top).
  const ng = ctx.createLinearGradient(0, -34, 0, -20);
  ng.addColorStop(0, '#bfe8ff'); ng.addColorStop(1, '#2a6ea8');
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.ellipse(0, -27, 5, 7, 0, 0, TAU); ctx.fill();
  // Nose + tail guns.
  ctx.fillStyle = '#200f0f'; ctx.beginPath(); ctx.arc(0, -30, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(0, -30, 2, 0, TAU); ctx.fill();
  for (const sx of [-14, 14]) {
    ctx.fillStyle = '#3a4048'; ctx.beginPath(); ctx.arc(sx, 30, 4, 0, TAU); ctx.fill();
  }
  // Side turrets (glow when firing is handled by muzzle flashes in game).
  for (const sx of [-58, -20, 20, 58]) {
    ctx.fillStyle = '#3a4048'; ctx.beginPath(); ctx.arc(sx, 6, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(sx, 6, 2, 0, TAU); ctx.fill();
  }
  // Bridge.
  const bg = ctx.createLinearGradient(0, -20, 0, 0);
  bg.addColorStop(0, '#bfe8ff'); bg.addColorStop(1, '#2a6ea8');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -8, 6, 10, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(2, -2); ctx.stroke();
  // Battle damage: scorch marks once the hull is hurt.
  if (hpFrac < 0.66) {
    ctx.fillStyle = `rgba(20,12,8,${0.35 * (1 - hpFrac) + 0.15})`;
    ctx.beginPath(); ctx.ellipse(-40, 12, 9, 5, 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(34, -14, 7, 4, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, 30, 6, 4, 0, 0, TAU); ctx.fill();
  }
  // Damage smoke when hurt.
  if (hpFrac < 0.5) {
    ctx.fillStyle = `rgba(60,60,60,${0.5 * (1 - hpFrac)})`;
    ctx.beginPath(); ctx.arc(-20 + Math.sin(t * 5) * 4, 10, 8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(24 + Math.cos(t * 4) * 4, 18, 7, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---- Birds: ambient flocks, small dark silhouettes, never enemies. ----
export function drawBird(ctx, x, y, t, phase, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const flap = Math.sin(t * 10 + phase);
  ctx.strokeStyle = 'rgba(29,43,51,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Body.
  ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
  // Flapping wings.
  ctx.moveTo(-2, 0); ctx.quadraticCurveTo(-7, -6 - flap * 4, -12, -8 - flap * 5);
  ctx.moveTo(2, 0); ctx.quadraticCurveTo(7, -6 - flap * 4, 12, -8 - flap * 5);
  ctx.stroke();
  ctx.restore();
}

// ---- Bullets, power-ups, rings.
export function drawPlayerBullet(ctx, x, y) {
  const g = ctx.createLinearGradient(x, y - 9, x, y + 5);
  g.addColorStop(0, '#fff6c0'); g.addColorStop(0.5, '#ffd23e'); g.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y - 2, 2.6, 9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y - 4, 1.2, 5, 0, 0, TAU); ctx.fill();
}
export function drawEnemyBullet(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = '#ff4a2a'; ctx.shadowBlur = 8;
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
  ctx.restore();
}
export function drawPowerup(ctx, x, y, kind, t) {
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t * 4) * 2;
  ctx.translate(0, bob);
  ctx.shadowColor = '#ffd23e'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#1a2a4a';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = kind === 'P' ? '#ffd23e' : kind === 'S' ? '#5ac8ff' : kind === 'B' ? '#ff7b1c' : '#ff5a8a';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
  ctx.fillStyle = kind === 'P' ? '#ffd23e' : kind === 'S' ? '#5ac8ff' : kind === 'B' ? '#ff7b1c' : '#ff5a8a';
  ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(kind === '1UP' ? '1UP' : kind, 0, 0.5);
  if (kind === '1UP') { ctx.font = 'bold 9px sans-serif'; }
  ctx.restore();
}
export function drawRing(ctx, x, y, r, t, passed) {
  ctx.save(); ctx.translate(x, y);
  const pulse = 1 + Math.sin(t * 3) * 0.08;
  ctx.scale(pulse, pulse);
  // Breathing outer halo (visual only — the chevroned ring itself is unchanged).
  ctx.strokeStyle = passed ? `rgba(57,211,83,${0.12 + 0.08 * Math.sin(t * 3)})` : `rgba(255,176,46,${0.12 + 0.08 * Math.sin(t * 3)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, TAU); ctx.stroke();
  ctx.shadowColor = passed ? '#39d353' : '#ffb02e';
  ctx.shadowBlur = 26;
  ctx.strokeStyle = passed ? '#39d353' : '#ffb02e';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = passed ? 'rgba(57,211,83,0.9)' : 'rgba(255,224,138,0.95)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  // Rotating dashes.
  ctx.strokeStyle = passed ? 'rgba(57,211,83,0.7)' : 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
    ctx.stroke();
  }
  // Gold chevrons pointing inward — the mission-ring marker. Explosion
  // rings are orange-red and spiky and never carry chevrons.
  ctx.fillStyle = passed ? 'rgba(57,211,83,0.95)' : 'rgba(255,224,138,0.95)';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4 + t * 0.4;
    const ca = Math.cos(a), sa = Math.sin(a);
    const px = -sa, py = ca; // perpendicular
    ctx.beginPath();
    ctx.moveTo(ca * (r - 2), sa * (r - 2));
    ctx.lineTo(ca * (r + 10) + px * 7, sa * (r + 10) + py * 7);
    ctx.lineTo(ca * (r + 10) - px * 7, sa * (r + 10) - py * 7);
    ctx.closePath(); ctx.fill();
  }
  // Centre beacon.
  ctx.fillStyle = passed ? '#39d353' : '#ffe08a';
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
}
