// hud.js — arcade top bar (scores, ALT / SPD / HDG) + backlit instrument strip.
// All drawn on the game canvas so the HUD is baked into every screenshot.
import { TAU, clamp } from './rng.js';

const AMBER = '#ffc46b';
const AMBER_DIM = '#e8a54b';

function dial(ctx, cx, cy, r, label, valueText, frac, tickLabels) {
  ctx.save();
  ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = '#101828'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3; ctx.strokeStyle = AMBER; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - 5, 0, TAU);
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,210,138,0.5)'; ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const a = (-0.75 + i * 0.15) * Math.PI;
    const x1 = cx + Math.cos(a) * (r - 9), y1 = cy + Math.sin(a) * (r - 9);
    const x2 = cx + Math.cos(a) * (r - 17), y2 = cy + Math.sin(a) * (r - 17);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineWidth = i % 5 === 0 ? 2.5 : 1.2; ctx.strokeStyle = '#ffe1a8'; ctx.stroke();
  }
  if (tickLabels) {
    ctx.fillStyle = '#cfe6ff'; ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [fp, txt] of tickLabels) {
      const a = (-0.75 + fp * 1.5) * Math.PI;
      ctx.fillText(txt, cx + Math.cos(a) * (r - 26), cy + Math.sin(a) * (r - 26));
    }
  }
  const na = (-0.75 + clamp(frac, 0, 1) * 1.5) * Math.PI;
  ctx.shadowColor = '#ffcf7a'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * (r - 14), cy + Math.sin(na) * (r - 14));
  ctx.lineWidth = 3; ctx.strokeStyle = '#ffcf7a'; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, TAU); ctx.fillStyle = AMBER; ctx.fill();
  // Digital readout just below centre; caption BELOW the dial so nothing collides.
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  ctx.fillText(valueText, cx, cy + 7);
  ctx.fillStyle = AMBER; ctx.font = 'bold 9px sans-serif';
  ctx.fillText(label, cx, cy + r + 8);
  ctx.restore();
}

export function drawTopBar(ctx, s, W) {
  // Dark bar with amber arcade type.
  ctx.fillStyle = 'rgba(6,18,36,0.92)';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = 'rgba(255,179,71,0.35)';
  ctx.fillRect(0, 62, W, 2);
  ctx.textBaseline = 'alphabetic';
  // Left: P1 score + best.
  ctx.textAlign = 'left';
  ctx.fillStyle = AMBER; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('P1  SCORE', 16, 18);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px monospace';
  ctx.fillText(String(s.score).padStart(6, '0'), 16, 48);
  ctx.fillStyle = AMBER; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('BEST', 190, 18);
  ctx.fillStyle = '#9fd8ff'; ctx.font = 'bold 26px monospace';
  ctx.fillText(String(Math.max(s.best, s.score)).padStart(6, '0'), 190, 48);
  // Centre: ALT / SPD / HDG — large legible numerals.
  const cx = W / 2;
  const items = [
    ['ALT', `${Math.round(s.altFt)}`, 'FT'],
    ['SPD', `${Math.round(s.knots)}`, 'KT'],
    ['HDG', String(Math.round(s.hdgDeg)).padStart(3, '0'), '°'],
  ];
  const bw = 118, gap = 14;
  const x0 = cx - (bw * 3 + gap * 2) / 2;
  items.forEach(([lbl, num, unit], i) => {
    const x = x0 + i * (bw + gap);
    ctx.fillStyle = 'rgba(255,179,71,0.14)';
    ctx.beginPath(); ctx.roundRect(x, 6, bw, 52, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,179,71,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 6, bw, 52, 8); ctx.stroke();
    ctx.fillStyle = AMBER; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(lbl, x + 10, 22);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px monospace';
    ctx.fillText(num, x + 10, 50);
    ctx.fillStyle = '#cfe6ff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(unit, x + bw - 26, 50);
  });
  // Right: wave, lives, bombs.
  ctx.textAlign = 'right';
  ctx.fillStyle = AMBER; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('WAVE', W - 16, 18);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px monospace';
  ctx.fillText(String(s.wave).padStart(2, '0'), W - 16, 48);
  // Lives (mini planes) + bombs under the wave, left of it.
  let lx = W - 110;
  ctx.textAlign = 'left';
  for (let i = 0; i < s.lives; i++) {
    drawMiniPlane(ctx, lx + i * 22, 30, '#5ac8ff');
  }
  ctx.fillStyle = AMBER; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('BOMB', W - 110, 56);
  for (let i = 0; i < s.bombs; i++) {
    ctx.fillStyle = '#ff7b1c';
    ctx.beginPath(); ctx.arc(W - 66 + i * 16, 52, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(W - 66 + i * 16, 52, 2, 0, TAU); ctx.fill();
  }
  // Ring objective, centre-right.
  ctx.fillStyle = s.ringsPassed >= s.ringsTotal ? '#39d353' : AMBER;
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`◈ RINGS ${s.ringsPassed}/${s.ringsTotal}`, W - 260, 26);
  ctx.fillStyle = '#cfe6ff'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText(s.boss ? '!! BOSS !!' : `NEXT: ${s.nextObjective}`, W - 260, 44);
}

function drawMiniPlane(ctx, x, y, color) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(3, 2); ctx.lineTo(9, 6); ctx.lineTo(3, 5);
  ctx.lineTo(2, 8); ctx.lineTo(-2, 8); ctx.lineTo(-3, 5); ctx.lineTo(-9, 6);
  ctx.lineTo(-3, 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawInstrumentStrip(ctx, s, W, H, t) {
  const y0 = H - 88;
  ctx.fillStyle = 'rgba(6,18,36,0.94)';
  ctx.fillRect(0, y0, W, 88);
  ctx.fillStyle = 'rgba(255,179,71,0.4)';
  ctx.fillRect(0, y0, W, 2);
  const cy = y0 + 40, r = 32;
  // Airspeed dial.
  dial(ctx, 62, cy, r, 'AIRSPEED', `${Math.round(s.knots)}`, s.knots / 320, null);
  // Altimeter dial.
  dial(ctx, 158, cy, r, 'ALTITUDE', `${Math.round(s.altFt)}`, s.altFt / 3000, null);
  // Heading compass card.
  ctx.save();
  ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(254, cy, r, 0, TAU);
  ctx.fillStyle = '#101828'; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3; ctx.strokeStyle = AMBER; ctx.stroke();
  const dirs = ['N', 'E', 'S', 'W'];
  ctx.fillStyle = '#ffe1a8'; ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  dirs.forEach((d, i) => {
    const a = (i * Math.PI) / 2 - s.hdgRad;
    ctx.fillText(d, 254 + Math.sin(a) * (r - 12), cy - Math.cos(a) * (r - 12));
  });
  ctx.fillStyle = '#ff7b1c';
  ctx.beginPath(); ctx.moveTo(254 - 6, cy - r + 4); ctx.lineTo(254 + 6, cy - r + 4); ctx.lineTo(254, cy - r + 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px monospace';
  ctx.fillText(String(Math.round(s.hdgDeg)).padStart(3, '0') + '°', 254, cy + 7);
  ctx.fillStyle = AMBER; ctx.font = 'bold 9px sans-serif';
  ctx.fillText('HEADING', 254, cy + r + 8);
  ctx.restore();
  // Weapon / shield / bomb readout (centre of the strip).
  const mx = W / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = AMBER; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('WEAPON', mx - 190, y0 + 22);
  const wnames = ['1-WAY', '2-WAY', '3-WAY', '3-WAY+'];
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px monospace';
  ctx.fillText(wnames[s.weapon - 1] || '1-WAY', mx - 190, y0 + 48);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i < s.weapon ? '#ffd23e' : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.roundRect(mx - 214 + i * 14, y0 + 58, 11, 8, 2); ctx.fill();
  }
  ctx.fillStyle = s.shield > 0 ? '#5ac8ff' : 'rgba(255,255,255,0.35)';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(s.shield > 0 ? '◉ SHIELD ON' : '○ SHIELD OFF', mx - 40, y0 + 30);
  ctx.fillStyle = '#cfe6ff'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`RINGS ${s.ringsPassed}/${s.ringsTotal}   ·   ${s.boss ? 'BOSS FIGHT' : `BOSS IN ${s.bossIn} WAVE${s.bossIn === 1 ? '' : 'S'}`}`, mx - 40, y0 + 52);
  // Right: flight data + hint.
  ctx.textAlign = 'right';
  ctx.fillStyle = AMBER; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('KELANA-9  ·  LAUT BIRU CHAIN', W - 16, y0 + 24);
  ctx.fillStyle = '#cfe6ff'; ctx.font = '11px sans-serif';
  ctx.fillText('ARROWS / WASD fly  ·  Z / SPACE fire  ·  X bomb  ·  P pause  ·  M sound', W - 16, y0 + 44);
  ctx.fillStyle = s.fuelLow ? '#ff5a4a' : '#9fd8ff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(s.fuelLow ? '⚠ FUEL LOW — FLY A RING TO REFUEL' : `FUEL ${Math.round(s.fuel)}%`, W - 16, y0 + 66);
}
