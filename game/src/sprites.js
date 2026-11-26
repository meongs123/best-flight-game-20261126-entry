// sprites.js — every sprite is drawn in code with canvas vector paths.
// 100% original art: no copied pixels, no image files. All craft point UP (-y).
import { TAU } from './rng.js';

function poly(ctx, pts, fill, stroke, lw = 1.5) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// ---- Player: the Kelana-9 interceptor (teal + cream + orange, twin engines).
export function drawPlayer(ctx, x, y, bank, t, shield, thrust) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bank * 0.35);
  // Engine flames.
  if (thrust > 0.05) {
    const f = 10 + Math.sin(t * 40) * 4 + thrust * 8;
    for (const sx of [-7, 7]) {
      const g = ctx.createLinearGradient(0, 14, 0, 14 + f + 8);
      g.addColorStop(0, 'rgba(255,220,120,0.95)');
      g.addColorStop(0.5, 'rgba(255,120,30,0.8)');
      g.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - 3.5, 14); ctx.lineTo(sx + 3.5, 14);
      ctx.lineTo(sx, 14 + f + 8); ctx.closePath(); ctx.fill();
    }
  }
  // Swept main wings.
  poly(ctx, [[-30, 2], [-8, -6], [-6, 6], [-26, 14]], '#0e6b7a', '#083d47');
  poly(ctx, [[30, 2], [8, -6], [6, 6], [26, 14]], '#0e6b7a', '#083d47');
  // Wingtip lights.
  ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(-30, 6, 2.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2aff66'; ctx.beginPath(); ctx.arc(30, 6, 2.4, 0, TAU); ctx.fill();
  // Tail fins.
  poly(ctx, [[-12, 12], [-20, 24], [-12, 22]], '#f2e8d5', '#083d47');
  poly(ctx, [[12, 12], [20, 24], [12, 22]], '#f2e8d5', '#083d47');
  // Fuselage.
  poly(ctx, [[0, -26], [4.5, -12], [5.5, 8], [4, 20], [-4, 20], [-5.5, 8], [-4.5, -12]], '#f2e8d5', '#083d47');
  // Orange cheatline.
  poly(ctx, [[-4.6, -2], [4.6, -2], [5, 8], [-5, 8]], '#ff7b1c');
  // Canopy (glowing).
  const cg = ctx.createLinearGradient(0, -18, 0, -2);
  cg.addColorStop(0, '#bfe8ff'); cg.addColorStop(1, '#2a6ea8');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.ellipse(0, -10, 3.4, 8, 0, 0, TAU); ctx.fill();
  // Nose tip.
  poly(ctx, [[0, -26], [2.4, -18], [-2.4, -18]], '#ff7b1c');
  // Twin engine pods.
  ctx.fillStyle = '#0e6b7a';
  ctx.beginPath(); ctx.ellipse(-7, 6, 3, 8, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, 6, 3, 8, 0, 0, TAU); ctx.fill();
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

// ---- Enemies (all original designs, pointing DOWN +y). ----
export function drawScout(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  poly(ctx, [[0, 14], [4, 4], [14, 10], [6, 0], [5, -8], [-5, -8], [-6, 0], [-14, 10], [-4, 4]], '#c23b2e', '#5c130c');
  ctx.fillStyle = '#ffd28a'; ctx.beginPath(); ctx.arc(0, 2, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}
export function drawFighter(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  poly(ctx, [[-24, -2], [-8, 4], [-6, -6], [-4, 12], [4, 12], [6, -6], [8, 4], [24, -2], [10, -10], [0, -14], [-10, -10]], '#a3271e', '#4a0f0a');
  poly(ctx, [[0, 16], [4, 6], [5, -4], [-5, -4], [-4, 6]], '#7a1d15', '#4a0f0a');
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(0, -2, 3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(-22, -2, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(22, -2, 1.8, 0, TAU); ctx.fill();
  ctx.restore();
}
export function drawWeaver(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3) * 0.15);
  poly(ctx, [[0, 16], [16, -8], [6, -10], [0, -4], [-6, -10], [-16, -8]], '#e07b1c', '#6b3405');
  poly(ctx, [[0, 16], [5, 2], [0, -6], [-5, 2]], '#8a4a2f');
  ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}
export function drawBomber(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  // Twin props (spinning blur discs).
  ctx.fillStyle = 'rgba(200,210,220,0.35)';
  ctx.beginPath(); ctx.arc(-20, -2, 9, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(20, -2, 9, 0, TAU); ctx.fill();
  // Wings.
  poly(ctx, [[-38, -4], [-6, -10], [-4, 0], [-38, 6]], '#5c6b4a', '#2c3620');
  poly(ctx, [[38, -4], [6, -10], [4, 0], [38, 6]], '#5c6b4a', '#2c3620');
  // Fuselage.
  poly(ctx, [[0, -18], [8, -8], [9, 12], [6, 22], [-6, 22], [-9, 12], [-8, -8]], '#7a8a5a', '#2c3620');
  // Nose turret + tail.
  ctx.fillStyle = '#2c3620'; ctx.beginPath(); ctx.arc(0, -14, 3.4, 0, TAU); ctx.fill();
  poly(ctx, [[-10, 20], [-16, 30], [-8, 28]], '#5c6b4a', '#2c3620');
  poly(ctx, [[10, 20], [16, 30], [8, 28]], '#5c6b4a', '#2c3620');
  // Roundels.
  for (const sx of [-22, 22]) {
    ctx.fillStyle = '#c23b2e'; ctx.beginPath(); ctx.arc(sx, 0, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2e8d5'; ctx.beginPath(); ctx.arc(sx, 0, 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
export function drawGunboat(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  // Wake.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-14, 24); ctx.moveTo(8, 12); ctx.lineTo(14, 24); ctx.stroke();
  poly(ctx, [[0, -12], [7, -4], [9, 10], [0, 14], [-9, 10], [-7, -4]], '#6b7280', '#2c313a');
  ctx.fillStyle = '#9aa4ab'; ctx.fillRect(-4, -6, 8, 10);
  // Turret (rotates slowly).
  ctx.save(); ctx.translate(0, -2); ctx.rotate(Math.sin(t * 0.8) * 0.5);
  ctx.fillStyle = '#3a4048'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
  ctx.fillRect(-1, -12, 2, 12);
  ctx.restore();
  ctx.restore();
}
// ---- Boss: the Benteng Terbang flying fortress.
export function drawBoss(ctx, x, y, t, hpFrac) {
  ctx.save(); ctx.translate(x, y);
  // Four prop blur discs.
  ctx.fillStyle = 'rgba(200,210,220,0.3)';
  for (const sx of [-58, -20, 20, 58]) { ctx.beginPath(); ctx.arc(sx, -6, 11, 0, TAU); ctx.fill(); }
  // Main wing.
  poly(ctx, [[-96, -8], [-10, -18], [-8, 2], [-96, 10]], '#4a2c2c', '#200f0f');
  poly(ctx, [[96, -8], [10, -18], [8, 2], [96, 10]], '#4a2c2c', '#200f0f');
  // Gold trim.
  ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-96, -4); ctx.lineTo(-10, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(96, -4); ctx.lineTo(10, -14); ctx.stroke();
  // Hull.
  poly(ctx, [[0, -34], [16, -18], [18, 22], [10, 44], [-10, 44], [-18, 22], [-16, -18]], '#6b2a20', '#200f0f');
  poly(ctx, [[0, -34], [8, -18], [8, 22], [-8, 22], [-8, -18]], '#8a3a2c');
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
  // Damage smoke when hurt.
  if (hpFrac < 0.5) {
    ctx.fillStyle = `rgba(60,60,60,${0.5 * (1 - hpFrac)})`;
    ctx.beginPath(); ctx.arc(-20 + Math.sin(t * 5) * 4, 10, 8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(24 + Math.cos(t * 4) * 4, 18, 7, 0, TAU); ctx.fill();
  }
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
  const pulse = 1 + Math.sin(t * 3) * 0.04;
  ctx.scale(pulse, pulse);
  ctx.shadowColor = passed ? '#39d353' : '#ffb02e';
  ctx.shadowBlur = 22;
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
  // Centre beacon.
  ctx.fillStyle = passed ? '#39d353' : '#ffe08a';
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
}
