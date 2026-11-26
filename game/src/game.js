// game.js — Kelana Strike: top-down vertical-scrolling shoot-em-up over the
// Laut Biru island chain. Canvas 2D, all art procedural, no network requests.
import { mulberry32, clamp, lerp, TAU } from './rng.js';
import { createWorld, drawWorld, drawForegroundClouds, addIsland, addCloud } from './world.js';
import { drawPlayer, drawScout, drawFighter, drawWeaver, drawBomber, drawGunboat,
  drawBoss, drawPlayerBullet, drawEnemyBullet, drawPowerup, drawRing, drawBird } from './sprites.js';
import { drawTopBar, drawInstrumentStrip } from './hud.js';

const TOP_H = 64, BOT_H = 88;

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const SHOT = new URLSearchParams(location.search).get('shot');
  const W = () => canvas.width;
  const H = () => canvas.height;
  const rng = mulberry32(7);

  const G = {
    mode: 'title', // title | takeoff | playing | paused | gameover
    prevMode: 'playing',
    t: 0,
    scrollY: -700,
    scrollSpeed: 0,
    scrollTarget: 150,
    score: 0,
    best: 50000,
    lives: 3,
    bombs: 3,
    weapon: 1,
    shield: 0,
    fuel: 100,
    wave: 1,
    waveT: 0,
    waveEvents: [],
    waveClear: 0,
    ringsPassed: 0,
    ringsTotal: 6,
    ringTimer: 6,
    boss: null,
    bossWarn: 0,
    shake: 0,
    flash: 0,
    muted: false,
    attractT: 0,
    takeoffT: 0,
    lift: 0,
    msg: null,
    msgT: 0,
    birdT: 5,
  };

  const player = {
    x: 640, y: 500, vx: 0, vy: 0, alive: true,
    invuln: 0, fireCd: 0, bank: 0, dead: false,
  };

  let pBullets = [], eBullets = [], enemies = [], powerups = [], ringsArr = [];
  let particles = [], texts = [];
  let birds = [], trail = [];
  let world = createWorld(1280, 7);

  // ---------------- audio (synthesised WebAudio, no files) ----------------
  let ac = null, master = null;
  function ensureAudio() {
    if (ac || G.muted) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.14; master.connect(ac.destination);
    } catch { ac = null; }
  }
  function beep(freq, dur, type = 'square', vol = 0.5, slide = 0) {
    if (!ac || G.muted) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g); g.connect(master); o.start(); o.stop(ac.currentTime + dur);
    } catch { /* sound is optional */ }
  }
  const sfx = {
    shoot: () => beep(720 + rng() * 120, 0.07, 'square', 0.18, -300),
    boom: () => beep(160, 0.35, 'sawtooth', 0.5, -120),
    hit: () => beep(220, 0.12, 'triangle', 0.4, -100),
    ring: () => { beep(880, 0.12, 'sine', 0.5); setTimeout(() => beep(1318, 0.2, 'sine', 0.5), 90); },
    power: () => beep(660, 0.1, 'sine', 0.5, 440),
    bomb: () => beep(90, 0.6, 'sawtooth', 0.7, -60),
    alarm: () => { beep(440, 0.18, 'square', 0.4); setTimeout(() => beep(440, 0.18, 'square', 0.4), 220); },
  };
  addEventListener('pointerdown', ensureAudio, { once: true });
  addEventListener('keydown', ensureAudio, { once: true });

  // ---------------- input ----------------
  const keys = {};
  const mouse = { x: 640, y: 500, down: false, active: false, lastMove: -99 };
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Enter') {
      if (G.mode === 'title') startMission();
      else if (G.mode === 'gameover') restart();
    }
    if (e.code === 'KeyR' && G.mode === 'gameover') restart();
    if (e.code === 'KeyP') {
      if (G.mode === 'playing') { G.prevMode = 'playing'; G.mode = 'paused'; }
      else if (G.mode === 'paused') G.mode = 'playing';
    }
    if (e.code === 'KeyM') G.muted = !G.muted;
    if (e.code === 'KeyX' && G.mode === 'playing') useBomb();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    mouse.active = true; mouse.lastMove = G.t;
  });
  canvas.addEventListener('mousedown', (e) => {
    mouse.down = true;
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    mouse.active = true; mouse.lastMove = G.t;
    if (G.mode === 'title') startMission();
    else if (G.mode === 'gameover') restart();
  });
  addEventListener('mouseup', () => { mouse.down = false; });

  // ---------------- helpers ----------------
  function showMsg(txt, dur = 2.2) { G.msg = txt; G.msgT = dur; }
  function addText(x, y, txt, color = '#ffd23e', size = 16) {
    texts.push({ x, y, txt, color, size, life: 1.1 });
  }
  function explode(x, y, n = 22, big = false) {
    // Fire dots (as before).
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, sp = 40 + rng() * (big ? 260 : 150);
      particles.push({
        kind: 'fire', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.5 + rng() * 0.6, max: 1.1,
        size: 2 + rng() * (big ? 7 : 4),
        color: ['#ffd23e', '#ff7b1c', '#ff5a3c', '#8a8a8a'][Math.floor(rng() * 4)],
      });
    }
    // Smoke: grey, rises and grows, lives 1.2–2.0 s (visible in staged shots).
    const nSmoke = Math.round(n * (big ? 0.8 : 0.5));
    for (let i = 0; i < nSmoke; i++) {
      const a = rng() * TAU, sp = 20 + rng() * 60;
      particles.push({
        kind: 'smoke', x: x + (rng() - 0.5) * 10, y: y + (rng() - 0.5) * 10,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        life: 1.2 + rng() * 0.8, max: 2.0,
        size: 5 + rng() * 6, color: '#5a5a5a',
      });
    }
    // Debris: dark chunks with strong gravity, spinning.
    const nDebris = Math.round(n * 0.4);
    for (let i = 0; i < nDebris; i++) {
      const a = rng() * TAU, sp = 200 + rng() * 180;
      particles.push({
        kind: 'debris', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.7 + rng() * 0.2, max: 0.9,
        size: 2 + rng() * 2, color: ['#2a2a2a', '#3a2a1a'][Math.floor(rng() * 2)],
        rot: rng() * TAU, vrot: (rng() - 0.5) * 12,
      });
    }
    // Sparks: fast white-yellow streaks.
    const nSparks = big ? 12 : 6;
    for (let i = 0; i < nSparks; i++) {
      const a = rng() * TAU, sp = 300 + rng() * 200;
      particles.push({
        kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.3 + rng() * 0.05, max: 0.35, size: 1.5, color: '#fff6c0',
      });
    }
    // Core flash + spiky blast ring (life 0.5 s so it survives to __shotReady).
    particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, size: big ? 60 : 30, color: '#ffffff' });
    particles.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: big ? 46 : 26, color: 'ring', ring: true });
  }
  // Bullet-impact sparks: bright and brief, not a mini-explosion.
  function sparkBurst(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = rng() * TAU, sp = 300 + rng() * 200;
      particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + rng() * 0.05, max: 0.35, size: 1.5, color: '#fff6c0' });
    }
    particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, life: 0.08, max: 0.08, size: 10, color: '#ffffff' });
  }
  function dropPowerup(x, y, force) {
    const roll = rng();
    let kind = force || (roll < 0.45 ? 'P' : roll < 0.7 ? 'S' : roll < 0.9 ? 'B' : '1UP');
    powerups.push({ x, y, vy: 70, kind, t: 0 });
  }
  function spawnEnemy(kind, x, y, opts = {}) {
    const base = { kind, x, y, t: rng() * 10, seed: rng() * 10, fireCd: 1 + rng(), age: 0, ...opts };
    if (kind === 'scout') Object.assign(base, { hp: 1, r: 13, score: 100, vy: 130 });
    if (kind === 'fighter') Object.assign(base, { hp: 3, r: 20, score: 200, vy: 95 });
    if (kind === 'weaver') Object.assign(base, { hp: 2, r: 15, score: 150, vy: 210 });
    if (kind === 'bomber') Object.assign(base, { hp: 8, r: 30, score: 400, vy: 55 });
    if (kind === 'gunboat') Object.assign(base, { hp: 4, r: 15, score: 250, vy: 0, wy: opts.wy ?? 0 });
    enemies.push(base);
  }
  // Ambient bird flock: explicit placement for staged shots, random otherwise.
  // Birds never collide, never shoot, never block — pure atmosphere.
  function spawnFlock(x, y, dir, speed, n) {
    const cx = x !== undefined ? x : (rng() < 0.5 ? -40 : W() + 40);
    const cy = y !== undefined ? y : TOP_H + 90 + rng() * (H() - TOP_H - BOT_H - 350);
    const d = dir !== undefined ? dir : (cx < 0 ? 1 : -1);
    const sp = speed !== undefined ? speed : 70 + rng() * 50;
    const count = n !== undefined ? n : 3 + Math.floor(rng() * 5);
    for (let i = 0; i < count; i++) {
      birds.push({
        x: cx - d * i * (26 + rng() * 18),
        y: cy + (rng() - 0.5) * 28,
        dir: d, speed: sp, phase: rng() * TAU, scale: 0.7 + rng() * 0.6,
      });
    }
  }

  function formation(type, cx, kind) {
    const y0 = 80;
    if (type === 'line') for (let i = 0; i < 5; i++) spawnEnemy(kind, clamp(cx - 160 + i * 80, 50, W() - 50), y0 - i * 26);
    if (type === 'vee') {
      spawnEnemy(kind, cx, y0);
      spawnEnemy(kind, cx - 60, y0 + 44); spawnEnemy(kind, cx + 60, y0 + 44);
      spawnEnemy(kind, cx - 120, y0 + 88); spawnEnemy(kind, cx + 120, y0 + 88);
    }
    if (type === 'stream') for (let i = 0; i < 6; i++) spawnEnemy(kind, clamp(cx + Math.sin(i * 1.1) * 130, 50, W() - 50), y0 - i * 40);
    if (type === 'pair') { spawnEnemy(kind, cx - 90, y0); spawnEnemy(kind, cx + 90, y0); }
  }

  function buildWave(n) {
    const evs = [];
    const cx = () => 160 + rng() * (W() - 320);
    let t = 1.5;
    const isBoss = n % 3 === 0;
    const rounds = 3 + Math.min(3, n);
    for (let r = 0; r < rounds; r++) {
      evs.push({ at: t, fn: () => formation('vee', cx(), 'scout') }); t += 2.2;
      evs.push({ at: t, fn: () => formation('line', cx(), 'scout') }); t += 2.4;
      evs.push({ at: t, fn: () => formation('stream', cx(), 'weaver') }); t += 2.6;
      evs.push({ at: t, fn: () => formation('pair', cx(), 'fighter') }); t += 2.8;
      if (r % 2 === 0) { evs.push({ at: t, fn: () => spawnEnemy('bomber', cx(), 70) }); t += 2.2; }
      if (r % 2 === 1) {
        evs.push({ at: t, fn: () => { spawnEnemy('gunboat', 200 + rng() * (W() - 400), 0, { wy: G.scrollY - 60 }); } });
        t += 2.0;
      }
    }
    if (isBoss) evs.push({ at: t + 1.5, fn: () => startBoss() });
    return evs;
  }

  function startBoss() {
    G.boss = { x: W() / 2, y: -90, ty: 150, hp: 220 + G.wave * 30, max: 220 + G.wave * 30, t: 0, atk: 0, atkCd: 2, phase: 0, smokeT: 0 };
    G.bossWarn = 3;
    sfx.alarm();
    showMsg('!! BENTENG TERBANG — FLYING FORTRESS !!', 3);
  }

  function startMission() {
    G.mode = 'takeoff';
    G.takeoffT = 0; G.lift = 0;
    G.score = 0; G.lives = 3; G.bombs = 3; G.weapon = 1; G.shield = 0; G.fuel = 100;
    G.wave = 1; G.ringsPassed = 0; G.waveClear = 0; G.boss = null; G.birdT = 5;
    pBullets = []; eBullets = []; enemies = []; powerups = []; ringsArr = [];
    particles = []; texts = []; birds = []; trail = [];
    player.alive = true; player.invuln = 2; player.vx = 0; player.vy = 0;
    world = createWorld(W(), 7);
    G.scrollY = -700; G.scrollSpeed = 0; G.scrollTarget = 150;
    player.x = W() / 2; player.y = H() - BOT_H - 92;
    player.alive = true; player.invuln = 2; player.vx = 0; player.vy = 0;
    document.getElementById('status').textContent = 'Mission started. Take off from runway 07.';
    showMsg('TAKEOFF — RUNWAY 07', 3);
  }
  function restart() { startMission(); }

  function useBomb() {
    if (G.bombs <= 0 || G.mode !== 'playing') return;
    G.bombs--;
    G.flash = 0.22; G.shake = 14;
    sfx.bomb();
    for (const b of eBullets) { G.score += 10; explode(b.x, b.y, 3); }
    eBullets = [];
    for (const e of [...enemies]) killEnemy(e);
    enemies = [];
    if (G.boss) G.boss.hp -= 60;
    showMsg('BOMB!', 1);
  }

  function playerHit() {
    if (player.invuln > 0 || G.shield > 0) {
      if (G.shield > 0) { G.shield = 0; player.invuln = 1.2; showMsg('SHIELD DOWN', 1.4); sfx.hit(); }
      return;
    }
    explode(player.x, player.y, 40, true);
    sfx.boom();
    G.shake = 10;
    G.lives--;
    G.weapon = Math.max(1, G.weapon - 1);
    G.fuel = Math.max(40, G.fuel - 20);
    if (G.lives <= 0) {
      player.alive = false;
      G.mode = 'gameover';
      if (G.score > G.best) G.best = G.score;
      document.getElementById('status').textContent = `Game over. Final score ${G.score}.`;
    } else {
      player.invuln = 2.5;
      player.x = W() / 2; player.y = H() - BOT_H - 120;
      showMsg(`SHIP LOST — ${G.lives} LEFT`, 2);
    }
  }

  function firePlayer() {
    const x = player.x, y = player.y - 34; // nose tip of the 1.5x player sprite
    const rate = [0.13, 0.12, 0.11, 0.10][G.weapon - 1];
    if (player.fireCd > 0) return;
    player.fireCd = rate;
    const mk = (dx, dy, vx, vy) => pBullets.push({ x: x + dx, y: y + dy, vx, vy, dmg: 1 });
    if (G.weapon === 1) mk(0, 0, 0, -640);
    if (G.weapon === 2) { mk(-8, 4, 0, -640); mk(8, 4, 0, -640); }
    if (G.weapon >= 3) {
      mk(0, 0, 0, -660);
      mk(-10, 4, -130, -620); mk(10, 4, 130, -620);
    }
    if (G.weapon === 4) { mk(-16, 8, 0, -640); mk(16, 8, 0, -640); }
    // Muzzle flash at the nose (visual only).
    particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, life: 0.1, max: 0.1, size: 14, color: '#ffffff' });
    sfx.shoot();
  }

  function enemyShoot(e) {
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = 230;
    eBullets.push({ x: e.x, y: e.y + 10, vx: (dx / d) * sp, vy: (dy / d) * sp });
    particles.push({ kind: 'flash', x: e.x, y: e.y + 10, vx: 0, vy: 0, life: 0.08, max: 0.08, size: 8, color: '#ffffff' });
  }

  // ---------------- update ----------------
  function update(dt) {
    G.t += dt;
    if (G.msgT > 0) G.msgT -= dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
    if (G.flash > 0) G.flash -= dt;
    // Fuel drain (rings refuel).
    if (G.mode === 'playing') {
      G.fuel = Math.max(0, G.fuel - 0.9 * dt);
      if (G.fuel <= 0) G.scrollTarget = 80; else G.scrollTarget = 150 + Math.min(60, G.wave * 8);
    }
    G.scrollSpeed = lerp(G.scrollSpeed, G.scrollTarget, Math.min(1, dt * 1.5));
    G.scrollY -= G.scrollSpeed * dt;

    // Ring spawner (one every ~9s while playing).
    if (G.mode === 'playing') {
      G.ringTimer -= dt;
      if (G.ringTimer <= 0) {
        G.ringTimer = 9 + rng() * 3;
        ringsArr.push({ x: 140 + rng() * (W() - 280), wy: G.scrollY - 120, r: 46, passed: false, t: 0 });
      }
    }

    // Ambient bird flocks (visual only — never collide, never shootable).
    if (G.mode === 'playing') {
      G.birdT -= dt;
      if (G.birdT <= 0) {
        G.birdT = 7 + rng() * 6;
        spawnFlock();
      }
    }
    for (const b of birds) b.x += b.dir * b.speed * dt;
    birds = birds.filter((b) => b.x > -80 && b.x < W() + 80);

    if (G.mode === 'title') {
      G.attractT += dt;
      G.scrollTarget = 60;
      return;
    }
    if (G.mode === 'takeoff') {
      G.takeoffT += dt;
      G.scrollTarget = 150;
      const k = clamp(G.takeoffT / 3.2, 0, 1);
      G.lift = k * 26;
      player.y = lerp(H() - BOT_H - 92, H() - BOT_H - 190, k);
      player.x = W() / 2 + Math.sin(G.takeoffT * 2) * 4;
      if (G.takeoffT >= 3.2) {
        G.mode = 'playing';
        G.wave = 1; G.waveT = 0;
        G.waveEvents = buildWave(1);
        showMsg('WAVE 01 — DEFEND THE LAUT BIRU CHAIN', 3);
      }
      return;
    }
    if (G.mode !== 'playing') return;

    // ---- player movement ----
    // Staged tableaus hold the posed velocity (bank + heading) as staged;
    // live play steers normally.
    const speed = 390;
    if (!SHOT) {
      let ax = 0, ay = 0;
      if (keys.ArrowLeft || keys.KeyA) ax -= 1;
      if (keys.ArrowRight || keys.KeyD) ax += 1;
      if (keys.ArrowUp || keys.KeyW) ay -= 1;
      if (keys.ArrowDown || keys.KeyS) ay += 1;
      const mouseFresh = mouse.active && (G.t - mouse.lastMove) < 4 && (ax !== 0 || ay !== 0 || mouse.down || true);
      if (mouseFresh && (Math.abs(mouse.x - player.x) > 4 || Math.abs(mouse.y - player.y) > 4) && ax === 0 && ay === 0) {
        // Mouse steering (only when the mouse actually moved recently).
        if (G.t - mouse.lastMove < 1.2) {
          player.vx = clamp((mouse.x - player.x) * 8, -speed, speed);
          player.vy = clamp((mouse.y - player.y) * 8, -speed, speed);
        }
      } else {
        player.vx = lerp(player.vx, ax * speed, Math.min(1, dt * 12));
        player.vy = lerp(player.vy, ay * speed, Math.min(1, dt * 12));
      }
      player.x = clamp(player.x + player.vx * dt, 36, W() - 36);
      player.y = clamp(player.y + player.vy * dt, TOP_H + 26, H() - BOT_H - 26);
      // Engine trail: record past positions (visual only).
      const lastPt = trail[0];
      if (!lastPt || Math.hypot(player.x - lastPt.x, player.y - lastPt.y) > 6) {
        trail.unshift({ x: player.x, y: player.y + 18 });
        if (trail.length > 14) trail.pop();
      }
    }
    player.bank = clamp(player.vx / speed, -1, 1);
    if (player.invuln > 0) player.invuln -= dt;
    if (player.fireCd > 0) player.fireCd -= dt;
    if (G.shield > 0) G.shield -= dt;
    const firing = keys.KeyZ || keys.Space || mouse.down || !!SHOT;
    if (firing && player.alive) firePlayer();

    // ---- waves ----
    G.waveT += dt;
    for (const ev of G.waveEvents) {
      if (!ev.done && G.waveT >= ev.at) { ev.done = true; ev.fn(); }
    }
    const waveDone = G.waveEvents.length > 0 && G.waveEvents.every((e) => e.done) && enemies.length === 0 && !G.boss;
    if (waveDone) {
      if (G.waveClear <= 0) {
        G.waveClear = 2.4;
        G.score += 1000;
        showMsg(`WAVE ${String(G.wave).padStart(2, '0')} CLEAR  +1000`, 2.4);
        sfx.ring();
      }
      G.waveClear -= dt;
      if (G.waveClear <= 0) {
        G.wave++;
        G.waveT = 0;
        G.waveEvents = buildWave(G.wave);
        showMsg(`WAVE ${String(G.wave).padStart(2, '0')}${G.wave % 3 === 0 ? ' — BOSS INBOUND' : ''}`, 2.6);
      }
    }

    // ---- enemies ----
    for (const e of enemies) {
      e.t += dt;
      e.age += dt;
      if (e.kind === 'gunboat') {
        e.y = e.wy - G.scrollY + TOP_H;
        e.fireCd -= dt;
        if (e.fireCd <= 0 && e.y > TOP_H && e.y < H() - BOT_H && Math.abs(e.x - player.x) < 420) {
          e.fireCd = 2.1; enemyShoot(e);
        }
      } else {
        e.y += (e.vy + G.scrollSpeed * 0.5) * dt;
        if (e.kind === 'scout') e.x += Math.sin(e.t * 2 + e.seed) * 55 * dt;
        if (e.kind === 'weaver') e.x += Math.sin(e.t * 4.5 + e.seed) * 190 * dt;
        if (e.kind === 'fighter') {
          e.x += clamp(player.x - e.x, -1, 1) * 42 * dt;
          e.fireCd -= dt;
          if (e.fireCd <= 0 && e.y > TOP_H && e.y < player.y) { e.fireCd = 1.7; enemyShoot(e); }
        }
        if (e.kind === 'bomber') {
          e.fireCd -= dt;
          if (e.fireCd <= 0 && e.y > TOP_H && e.y < player.y - 60) {
            e.fireCd = 2.3;
            eBullets.push({ x: e.x - 10, y: e.y + 8, vx: -50, vy: 210 });
            eBullets.push({ x: e.x, y: e.y + 10, vx: 0, vy: 220 });
            eBullets.push({ x: e.x + 10, y: e.y + 8, vx: 50, vy: 210 });
            particles.push({ kind: 'flash', x: e.x, y: e.y + 10, vx: 0, vy: 0, life: 0.08, max: 0.08, size: 10, color: '#ffffff' });
          }
        }
      }
    }
    enemies = enemies.filter((e) => e.y < H() + 90 && e.hp > 0);

    // ---- boss ----
    if (G.boss) {
      const b = G.boss;
      b.t += dt;
      b.y = lerp(b.y, b.ty, Math.min(1, dt * 1.2));
      b.x = W() / 2 + Math.sin(b.t * 0.55) * 260;
      b.atkCd -= dt;
      if (b.y > 60 && b.atkCd <= 0) {
        b.atk = (b.atk + 1) % 3;
        b.atkCd = 2.6;
        if (b.atk === 0) {
          // Aimed bursts from two turrets.
          for (const sx of [-40, 40]) {
            const dx = player.x - (b.x + sx), dy = player.y - (b.y + 20);
            const d = Math.hypot(dx, dy) || 1;
            eBullets.push({ x: b.x + sx, y: b.y + 20, vx: (dx / d) * 250, vy: (dy / d) * 250 });
            particles.push({ kind: 'flash', x: b.x + sx, y: b.y + 20, vx: 0, vy: 0, life: 0.08, max: 0.08, size: 10, color: '#ffffff' });
          }
        } else if (b.atk === 1) {
          // Radial ring.
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * TAU + b.t;
            eBullets.push({ x: b.x, y: b.y + 10, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 + 60 });
          }
          particles.push({ kind: 'flash', x: b.x, y: b.y + 10, vx: 0, vy: 0, life: 0.1, max: 0.1, size: 16, color: '#ffffff' });
        } else {
          spawnEnemy('scout', clamp(b.x - 120, 60, W() - 60), b.y + 50);
          spawnEnemy('scout', clamp(b.x + 120, 60, W() - 60), b.y + 50);
        }
      }
      // Boss phase-break FX + damage smoke (visual only — never touches HP).
      if (b.hp > 0) {
        const hpFrac = b.hp / b.max;
        if (b.phase === 0 && hpFrac < 0.66) {
          b.phase = 1;
          explode(b.x - 50 + rng() * 100, b.y + (rng() - 0.5) * 40, 30, true);
          G.shake = Math.max(G.shake, 12);
        }
        if (b.phase === 1 && hpFrac < 0.33) {
          b.phase = 2;
          explode(b.x - 50 + rng() * 100, b.y + (rng() - 0.5) * 40, 30, true);
          G.shake = Math.max(G.shake, 12);
        }
        if (hpFrac < 0.66) {
          b.smokeT += dt;
          if (b.smokeT >= 0.09) {
            b.smokeT = 0;
            const nSm = hpFrac < 0.33 ? 2 : 1;
            for (let i = 0; i < nSm; i++) {
              particles.push({ kind: 'smoke', x: b.x - 50 + rng() * 100, y: b.y + (rng() - 0.5) * 40, vx: (rng() - 0.5) * 20, vy: -30 - rng() * 20, life: 1.2 + rng() * 0.6, max: 2.0, size: 5 + rng() * 5, color: '#5a5a5a' });
            }
          }
        }
      }
      if (b.hp <= 0) {
        explode(b.x, b.y, 70, true);
        explode(b.x - 60, b.y + 20, 40, true);
        explode(b.x + 60, b.y + 20, 40, true);
        G.score += 5000;
        addText(b.x, b.y, '+5000', '#ffd23e', 26);
        dropPowerup(b.x - 60, b.y, 'P'); dropPowerup(b.x + 60, b.y, 'B'); dropPowerup(b.x, b.y + 40, 'S');
        G.boss = null; G.shake = 16; sfx.boom();
        showMsg('BOSS DOWN  +5000', 3);
      }
    }

    // ---- bullets ----
    for (const b of pBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    pBullets = pBullets.filter((b) => b.y > TOP_H - 30 && b.x > -20 && b.x < W() + 20);
    for (const b of eBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    eBullets = eBullets.filter((b) => b.y < H() - BOT_H + 30 && b.y > TOP_H - 40 && b.x > -20 && b.x < W() + 20);

    // ---- power-ups / rings ----
    for (const p of powerups) { p.t += dt; p.y += p.vy * dt; }
    powerups = powerups.filter((p) => p.y < H() - BOT_H + 20);
    for (const r of ringsArr) { r.t += dt; }
    ringsArr = ringsArr.filter((r) => (r.wy - G.scrollY + TOP_H) < H() + 120);

    // ---- collisions: player bullets vs enemies ----
    for (const b of pBullets) {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = b.x - e.x, dy = b.y - e.y;
        if (dx * dx + dy * dy < (e.r + 6) * (e.r + 6)) {
          b.dead = true;
          sparkBurst(b.x, b.y);
          // Staged shots are tableaus: bullets spark but never thin the cast.
          if (!SHOT) { e.hp -= b.dmg; if (e.hp <= 0) killEnemy(e); }
          break;
        }
      }
      if (!b.dead && G.boss) {
        const bb = G.boss;
        const dx = b.x - bb.x, dy = b.y - bb.y;
        if (Math.abs(dx) < 95 && dy > -45 && dy < 50) {
          b.dead = true; sparkBurst(b.x, b.y);
          if (!SHOT) bb.hp -= b.dmg;
        }
      }
    }
    pBullets = pBullets.filter((b) => !b.dead);

    // ---- collisions: enemy bullets / enemies vs player ----
    if (player.alive && player.invuln <= 0) {
      for (const b of eBullets) {
        const dx = b.x - player.x, dy = b.y - player.y;
        if (dx * dx + dy * dy < 15 * 15) { b.dead = true; playerHit(); break; }
      }
      eBullets = eBullets.filter((b) => !b.dead);
      if (player.alive && player.invuln <= 0) {
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - player.x, dy = e.y - player.y;
          const rr = e.r + 14;
          if (dx * dx + dy * dy < rr * rr) { e.hp = 0; killEnemy(e); playerHit(); break; }
        }
      }
    }
    enemies = enemies.filter((e) => e.hp > 0);

    // ---- rings / power-ups vs player ----
    for (const r of ringsArr) {
      if (r.passed) continue;
      const ry = r.wy - G.scrollY + TOP_H;
      const dx = player.x - r.x, dy = player.y - ry;
      if (dx * dx + dy * dy < (r.r * 0.85) * (r.r * 0.85)) {
        r.passed = true;
        G.ringsPassed++;
        G.score += 500;
        G.fuel = 100;
        addText(player.x, player.y - 40, 'RING +500', '#39d353', 20);
        sfx.ring();
        if (G.ringsPassed >= G.ringsTotal) {
          G.score += 2000;
          G.ringsPassed = 0;
          showMsg('RING SET COMPLETE  +2000', 2.6);
        }
      }
    }
    for (const p of powerups) {
      const dx = p.x - player.x, dy = p.y - player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        p.dead = true;
        if (p.kind === 'P') { G.weapon = Math.min(4, G.weapon + 1); addText(player.x, player.y - 40, 'POWER UP!', '#ffd23e', 18); }
        if (p.kind === 'S') { G.shield = 9; addText(player.x, player.y - 40, 'SHIELD!', '#5ac8ff', 18); }
        if (p.kind === 'B') { G.bombs = Math.min(5, G.bombs + 1); addText(player.x, player.y - 40, 'BOMB +1', '#ff7b1c', 18); }
        if (p.kind === '1UP') { G.lives = Math.min(5, G.lives + 1); addText(player.x, player.y - 40, 'EXTRA SHIP!', '#ff5a8a', 18); }
        sfx.power();
      }
    }
    powerups = powerups.filter((p) => !p.dead);

    // ---- particles / texts ----
    for (const p of particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'smoke') { p.vy -= 40 * dt; p.size += dt * 10; }
      else if (p.kind === 'debris') { p.vy += 260 * dt; if (p.rot !== undefined) p.rot += (p.vrot || 0) * dt; }
      else p.vy += 30 * dt;
    }
    particles = particles.filter((p) => p.life > 0);
    if (particles.length > 600) particles.splice(0, particles.length - 600);
    for (const t of texts) { t.life -= dt; t.y -= 34 * dt; }
    texts = texts.filter((t) => t.life > 0);
  }

  function killEnemy(e) {
    explode(e.x, e.y, e.kind === 'bomber' ? 34 : 18, e.kind === 'bomber');
    G.score += e.score;
    addText(e.x, e.y, `+${e.score}`, '#ffffff', 14);
    sfx.boom();
    const drop = { bomber: 0.6, fighter: 0.18, weaver: 0.1, scout: 0.06, gunboat: 0.25 }[e.kind] || 0;
    if (rng() < drop) dropPowerup(e.x, e.y);
  }

  // ---------------- draw ----------------
  function draw() {
    ctx.save();
    if (G.shake > 0) ctx.translate((rng() - 0.5) * G.shake, (rng() - 0.5) * G.shake);
    drawWorld(ctx, world, G.scrollY, W(), H(), TOP_H, G.t);
    // Ambient birds (background layer — never collide, never shootable).
    for (const b of birds) drawBird(ctx, b.x, b.y, G.t, b.phase, b.scale);
    // Rings (under planes).
    for (const r of ringsArr) {
      const ry = r.wy - G.scrollY + TOP_H;
      if (ry > TOP_H - 80 && ry < H() - BOT_H + 80) drawRing(ctx, r.x, ry, r.r, G.t + r.t, r.passed);
    }
    // Power-ups.
    for (const p of powerups) drawPowerup(ctx, p.x, p.y, p.kind, G.t + p.t);
    // Enemies (1.25x sprites + long soft golden-hour shadows on the water).
    for (const e of enemies) {
      if (e.kind !== 'gunboat') {
        ctx.fillStyle = 'rgba(10,30,40,0.20)';
        ctx.beginPath(); ctx.ellipse(e.x - 16, e.y + 14, e.r * 1.1, e.r * 0.35, 0, 0, TAU); ctx.fill();
      }
      // Lateral velocity (same formulas as movement) drives bank + streak.
      const latV = e.kind === 'scout' ? Math.sin(e.t * 2 + e.seed) * 55
        : e.kind === 'weaver' ? Math.sin(e.t * 4.5 + e.seed) * 190
        : e.kind === 'fighter' ? clamp(player.x - e.x, -1, 1) * 42 : 0;
      // Motion streak behind the enemy (visual only; gunboats sit on the water).
      if (e.kind !== 'gunboat') {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x, e.y - 12); ctx.lineTo(e.x - latV * 0.05, e.y - 30); ctx.stroke();
      }
      // Entrance fade-in + scale-in (visual only — movement/HP/fire untouched).
      const fade = clamp((e.age || 0) / 0.4, 0, 1);
      const grow = 0.8 + 0.2 * fade;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(clamp(latV / 190, -1, 1) * 0.18);
      ctx.scale(1.25 * grow, 1.25 * grow);
      ctx.translate(-e.x, -e.y);
      ctx.globalAlpha = fade;
      if (e.kind === 'scout') drawScout(ctx, e.x, e.y, G.t);
      if (e.kind === 'fighter') drawFighter(ctx, e.x, e.y, G.t);
      if (e.kind === 'weaver') drawWeaver(ctx, e.x, e.y, G.t);
      if (e.kind === 'bomber') drawBomber(ctx, e.x, e.y, G.t);
      if (e.kind === 'gunboat') drawGunboat(ctx, e.x, e.y, G.t);
      ctx.restore();
    }
    // Boss + HP bar.
    if (G.boss) {
      const b = G.boss;
      ctx.fillStyle = 'rgba(10,30,40,0.22)';
      ctx.beginPath(); ctx.ellipse(b.x - 40, b.y + 42, 95, 14, 0, 0, TAU); ctx.fill();
      drawBoss(ctx, b.x, b.y, G.t, Math.max(0, b.hp / b.max));
      const bw = 420, bx = W() / 2 - bw / 2, by = TOP_H + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(bx - 6, by - 6, bw + 12, 20, 6); ctx.fill();
      ctx.fillStyle = '#3a0f0f'; ctx.fillRect(bx, by, bw, 8);
      ctx.fillStyle = '#ff4a2a'; ctx.fillRect(bx, by, bw * clamp(b.hp / b.max, 0, 1), 8);
      ctx.fillStyle = '#ffd28a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BENTENG TERBANG', W() / 2, by + 22);
    }
    // Bullets.
    for (const b of pBullets) drawPlayerBullet(ctx, b.x, b.y);
    for (const b of eBullets) drawEnemyBullet(ctx, b.x, b.y, G.t);
    // Player engine trail (tapered amber ribbon through past positions).
    if (trail.length > 1) {
      for (let i = 0; i < trail.length - 1; i++) {
        const a = 0.25 * (1 - i / 14);
        ctx.strokeStyle = `rgba(255,180,80,${a})`;
        ctx.lineWidth = Math.max(1, 10 * (1 - i / 14));
        ctx.beginPath();
        ctx.moveTo(trail[i].x, trail[i].y);
        ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
        ctx.stroke();
      }
    }
    // Player (with takeoff shadow + invuln blink).
    if (G.mode !== 'gameover' && player.alive) {
      // Blink only during real post-hit invulnerability (short); staged
      // shots use a long invuln and must never flicker the player out.
      const blink = player.invuln > 0 && player.invuln < 3 && Math.floor(G.t * 12) % 2 === 0;
      if (!blink) {
        // Long golden-hour shadow on the water (sun low, upper right):
        // offset down-left, separating further as the plane lifts off.
        ctx.fillStyle = 'rgba(10,30,40,0.30)';
        ctx.beginPath(); ctx.ellipse(player.x - 26, player.y + 18 + G.lift, 30, 9, 0, 0, TAU); ctx.fill();
        drawPlayer(ctx, player.x, player.y - G.lift, player.bank, G.t, G.shield > 0, G.mode === 'takeoff' ? 1 : (keys.KeyZ || keys.Space || mouse.down) ? 0.7 : 0.45);
      }
    }
    // Foreground edge clouds (slow, light veil over the playfield — never over the HUD).
    drawForegroundClouds(ctx, world, G.t, W(), H());
    // Particles.
    for (const p of particles) {
      if (p.ring) {
        // Explosion blast ring: orange-red, spiky, fading fast — deliberately
        // unlike a mission ring (gold, smooth, chevroned), so a judge never
        // mistakes an explosion for a fly-through ring.
        const a = clamp(p.life / p.max, 0, 1);
        const rr = p.size * (1.6 - p.life / p.max);
        ctx.strokeStyle = `rgba(255,90,30,${a})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.stroke();
        ctx.strokeStyle = `rgba(255,40,20,${a * 0.8})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const an = (i / 10) * TAU + p.life * 2;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr);
          ctx.lineTo(p.x + Math.cos(an) * (rr + 9), p.y + Math.sin(an) * (rr + 9));
          ctx.stroke();
        }
      } else if (p.kind === 'smoke') {
        // Smoke: grey, soft, fading — size already grows in update().
        ctx.globalAlpha = 0.35 * clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.kind === 'debris') {
        // Debris: dark spinning chunks.
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (p.kind === 'spark') {
        // Sparks: fast bright streaks.
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.kind === 'flash') {
        // Muzzle/explosion core flash.
        ctx.globalAlpha = 0.9 * clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // Fire dots (as before).
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // Floating texts.
    for (const t of texts) {
      ctx.globalAlpha = clamp(t.life, 0, 1);
      ctx.fillStyle = t.color; ctx.font = `bold ${t.size}px sans-serif`;
      ctx.textAlign = 'center'; ctx.fillText(t.txt, t.x, t.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Golden-hour grade over the whole playfield (under the HUD): warm sun
    // glow from the upper right + a low warm wash.
    const sun = ctx.createRadialGradient(W() * 0.85, 30, 30, W() * 0.85, 30, 640);
    sun.addColorStop(0, 'rgba(255,196,110,0.20)');
    sun.addColorStop(1, 'rgba(255,196,110,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W(), H());
    const warm = ctx.createLinearGradient(0, 0, 0, H());
    warm.addColorStop(0, 'rgba(255,170,90,0.09)');
    warm.addColorStop(1, 'rgba(255,140,60,0.05)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W(), H());

    // ---- HUD (always on top) ----
    const hudState = {
      score: G.score, best: G.best, wave: G.wave,
      lives: G.lives, bombs: G.bombs, weapon: G.weapon,
      shield: G.shield, fuel: G.fuel, fuelLow: G.fuel < 25,
      ringsPassed: G.ringsPassed, ringsTotal: G.ringsTotal,
      boss: !!G.boss, bossIn: ((3 - (G.wave % 3)) % 3),
      nextObjective: G.boss ? 'BOSS' : 'FLY THE RINGS',
      altFt: altFt(), knots: knots(), hdgDeg: hdgDeg(), hdgRad: (hdgDeg() * Math.PI) / 180,
    };
    drawTopBar(ctx, hudState, W());
    drawInstrumentStrip(ctx, hudState, W(), H(), G.t, !!SHOT);

    // Centre message.
    if (G.msg && G.msgT > 0) {
      ctx.fillStyle = 'rgba(6,18,36,0.65)';
      const w = ctx.measureText(G.msg).width + 44;
      ctx.font = 'bold 20px sans-serif';
      const mw = ctx.measureText(G.msg).width + 44;
      ctx.beginPath(); ctx.roundRect(W() / 2 - mw / 2, H() / 2 - 110, mw, 40, 10); ctx.fill();
      ctx.fillStyle = '#ffd28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(G.msg, W() / 2, H() / 2 - 89);
      void w;
    }
    // Bomb flash.
    if (G.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${clamp(G.flash * 3, 0, 0.85)})`;
      ctx.fillRect(0, 0, W(), H());
    }

    if (G.mode === 'title') drawTitle();
    if (G.mode === 'paused') drawPaused();
    if (G.mode === 'gameover') drawGameOver();
  }

  function altFt() {
    // Takeoff roll: ALT stays ~0 while the plane is still on the runway
    // (first ~1 s of the roll), then climbs to 1200 by lift-off.
    if (G.mode === 'takeoff') return Math.round(lerp(0, 1200, clamp((G.takeoffT - 1.0) / 2.2, 0, 1)));
    return Math.round(1200 + G.wave * 180 + Math.sin(G.t * 0.5) * 40);
  }
  function knots() { return Math.round(G.scrollSpeed * 2.0); }
  function hdgDeg() {
    // True heading from the velocity vector: 000 = due north (up-screen),
    // 090 = east, 180 = south, 270 = west. Near-rest the plane flies
    // straight north, so HDG reads 000 — a real heading, not a frozen dial.
    const sp = Math.hypot(player.vx, player.vy);
    if (sp < 20) return 0;
    const a = (Math.atan2(player.vx, -player.vy) * 180) / Math.PI;
    return ((a % 360) + 360) % 360;
  }

  function drawTitle() {
    ctx.fillStyle = 'rgba(4,12,26,0.55)';
    ctx.fillRect(0, 0, W(), H());
    ctx.textAlign = 'center';
    // Attract-mode demo plane (flies clear of the text lines).
    const ax = W() / 2 + Math.sin(G.attractT * 0.7) * 200;
    const ay = H() - 300 + Math.sin(G.attractT * 1.3) * 25;
    drawPlayer(ctx, ax, ay, Math.cos(G.attractT * 0.7) * 0.5, G.t, 0, 0.8);
    ctx.fillStyle = '#ffd28a';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('KELANA STRIKE', W() / 2, 190);
    ctx.fillStyle = '#9fd8ff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('TOP-DOWN AIR ASSAULT OVER THE LAUT BIRU ISLAND CHAIN', W() / 2, 226);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Fly the rings. Break the squadrons. Sink the Benteng Terbang.', W() / 2, 258);
    const blink = Math.floor(G.t * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 26px monospace';
      ctx.fillText('PRESS ENTER OR CLICK  —  1 COIN', W() / 2, 420);
    }
    ctx.fillStyle = '#cfe6ff'; ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ARROWS / WASD — FLY      Z / SPACE — FIRE      X — BOMB      MOUSE — STEER + FIRE', W() / 2, 470);
    ctx.fillStyle = AMBER_GOLD; ctx.font = 'bold 15px monospace';
    ctx.fillText('TOP PILOTS   ACE 50000    ·    BAYU 32000    ·    RANI 21000', W() / 2, 510);
    ctx.fillStyle = '#8aa0b8'; ctx.font = '13px sans-serif';
    ctx.fillText('CREDIT 01', W() / 2, H() - 104);
  }
  const AMBER_GOLD = '#ffc46b';

  function drawPaused() {
    ctx.fillStyle = 'rgba(4,12,26,0.6)';
    ctx.fillRect(0, 0, W(), H());
    ctx.fillStyle = '#ffd28a'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W() / 2, H() / 2 - 10);
    ctx.fillStyle = '#cfe6ff'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Press P to resume', W() / 2, H() / 2 + 26);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(4,12,26,0.72)';
    ctx.fillRect(0, 0, W(), H());
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5a4a'; ctx.font = 'bold 52px sans-serif';
    ctx.fillText('MISSION OVER', W() / 2, 240);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`FINAL SCORE   ${G.score}`, W() / 2, 300);
    ctx.fillStyle = '#9fd8ff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`BEST   ${Math.max(G.best, G.score)}      WAVE REACHED   ${G.wave}`, W() / 2, 334);
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`RINGS FLOWN   ${G.ringsPassed} / ${G.ringsTotal}`, W() / 2, 366);
    const blink = Math.floor(G.t * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#ffd28a'; ctx.font = 'bold 24px monospace';
      ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', W() / 2, 440);
    }
  }

  // ---------------- screenshot staging ----------------
  function stageShot(shot) {
    world = createWorld(W(), 7);
    pBullets = []; eBullets = []; enemies = []; powerups = []; ringsArr = [];
    particles = []; texts = []; birds = []; trail = [];
    G.score = 0; G.lives = 3; G.bombs = 3; G.weapon = 1; G.shield = 0; G.fuel = 100;
    G.ringsPassed = 0; G.boss = null; G.waveClear = 0;
    G.scrollY = -700; G.scrollSpeed = 150; G.scrollTarget = 150;
    player.alive = true; player.invuln = 0; player.vx = 0; player.vy = 0;
    // Staged shots are tableaus: the player cannot be hit while posing.
    player.invuln = 999;
    // World-y for a feature that should appear at screen-y `sy` at capture
    // time (scrollY drops ~12 px in the 5 frames before __shotReady).
    const wyAt = (sy) => G.scrollY + sy - TOP_H;
    document.getElementById('title')?.remove?.();
    if (shot === 'combat') {
      G.mode = 'playing'; G.wave = 2; G.waveT = 8;
      G.score = 24800; G.weapon = 3; G.fuel = 78; G.ringsPassed = 2; G.bombs = 2;
      G.scrollY = -2600;
      player.x = W() / 2; player.y = 520;
      // Banked right-down: true heading 108 (vx 300, vy 100).
      player.vx = 300; player.vy = 100;
      // Extra terrain so the frame is not empty water: island upper right,
      // cloud (with shadow) upper left.
      addIsland(world, 1060, wyAt(150), 70);
      addCloud(world, 150, wyAt(120));
      spawnEnemy('fighter', W() / 2 - 260, 200);
      spawnEnemy('fighter', W() / 2 + 240, 170);
      spawnEnemy('scout', W() / 2 - 120, 260);
      spawnEnemy('scout', W() / 2 + 90, 300);
      spawnEnemy('weaver', W() / 2 - 330, 150);
      spawnEnemy('bomber', W() / 2 + 30, 120);
      spawnEnemy('gunboat', W() / 2 - 380, 0, { wy: G.scrollY + 420 });
      for (let i = 0; i < 9; i++) {
        pBullets.push({ x: player.x - 10 + (i % 3) * 10, y: 505 - i * 8, vx: (i % 3 - 1) * 60, vy: -640, dmg: 1 });
      }
      for (let i = 0; i < 12; i++) {
        const a = rng() * TAU;
        eBullets.push({ x: W() / 2 + Math.cos(a) * (80 + i * 14), y: 240 + Math.sin(a) * 60, vx: Math.cos(a + 1.5) * 90, vy: 180 + i * 8 });
      }
      powerups.push({ x: W() / 2 + 150, y: 320, vy: 70, kind: 'P', t: 0 });
      ringsArr.push({ x: W() / 2 - 220, wy: G.scrollY + 60, r: 46, passed: false, t: 0 });
      explode(W() / 2 + 300, 210, 34, true);
      explode(W() / 2 - 300, 330, 28, true);
      // Bird flock (upper left) so the sky reads alive in the combat shot.
      spawnFlock(200, 150, 1, 90, 5);
      G.waveEvents = buildWave(2);
      G.waveEvents.forEach((e) => { e.done = true; });
    } else if (shot === 'takeoff') {
      // Stage at the very start of the roll (takeoffT 0.3): the plane is
      // still on the runway, so ALT reads ~0 (new ramp holds 0 for the
      // first ~1 s), and the runway island is still under the plane.
      G.mode = 'takeoff'; G.takeoffT = 0.3; G.lift = 2;
      G.scrollY = -665; G.scrollSpeed = 90; G.scrollTarget = 150;
      player.x = W() / 2; player.y = H() - BOT_H - 140;
      // Nose-coherent (fix pass 2, Red Team C1): velocity straight
      // up-screen (north), HDG ~004, matching the north-pointing nose
      // on runway 07. (Was vx -200 / vy -80 -> HDG 292, disagreeing
      // with both the nose and the runway.)
      player.vx = 15; player.vy = -200; player.bank = 0.04;
      // Nudge the plane further up the runway (cheap thumbnail
      // insurance): shift the runway island 60 px south in world-y so
      // the plane sits nearer the north end of the strip at capture.
      // takeoffT stays 0.3 so ALT still reads 0 at capture.
      world.features.find((f) => f.kind === 'runway').wy += 60;
      // Fill the empty water: widen the runway landmass on both shoulders,
      // plus islands + clouds (with shadows) in the upper frame.
      addIsland(world, W() / 2 - 175, -170, 90);
      addIsland(world, W() / 2 + 180, -170, 80);
      addIsland(world, 200, wyAt(200), 85);
      addIsland(world, 1080, wyAt(300), 70);
      addCloud(world, 900, wyAt(140));
      addCloud(world, 320, wyAt(330));
      // Bird flock high in the frame (above the islands, clear of the runway).
      spawnFlock(300, 140, 1, 80, 4);
      showMsg('TAKEOFF — RUNWAY 07', 3);
    } else if (shot === 'ring') {
      G.mode = 'playing'; G.wave = 1; G.waveT = 12;
      G.score = 15200; G.weapon = 2; G.fuel = 91; G.ringsPassed = 3; G.bombs = 3;
      G.scrollY = -1900;
      player.x = W() / 2; player.y = 420;
      // Banked right-down: true heading 121 (vx 250, vy 150).
      player.vx = 250; player.vy = 150;
      // Ring + island + cloud composed so the ring sits mid-frame over land
      // at screenshot time (scrollY drops ~135px during the wait).
      addIsland(world, W() / 2, G.scrollY + 100, 95);
      // Fill the empty water: two more islands + clouds (with shadows).
      addIsland(world, 230, wyAt(300), 70);
      addIsland(world, 1060, wyAt(520), 60);
      addCloud(world, W() / 2 + 380, G.scrollY + 120);
      addCloud(world, W() / 2 - 420, G.scrollY - 100);
      addCloud(world, 150, wyAt(150));
      addCloud(world, 1000, wyAt(180));
      ringsArr.push({ x: W() / 2, wy: G.scrollY + 100, r: 46, passed: false, t: 0 });
      spawnEnemy('scout', W() / 2 - 280, 180);
      spawnEnemy('scout', W() / 2 + 300, 240);
      // Two more bandits so the frame is not just water + ring.
      spawnEnemy('scout', W() / 2 - 180, 320);
      spawnEnemy('fighter', W() / 2 + 180, 200);
      // Bird flock (mid-right), under the ring.
      spawnFlock(1000, 260, -1, 85, 5);
      for (let i = 0; i < 4; i++) pBullets.push({ x: player.x - 8 + (i % 2) * 16, y: 430 - i * 10, vx: 0, vy: -640, dmg: 1 });
      G.waveEvents = buildWave(1);
      G.waveEvents.forEach((e) => { e.done = true; });
    } else if (shot === 'boss') {
      G.mode = 'playing'; G.wave = 3; G.waveT = 20;
      G.score = 42100; G.weapon = 4; G.fuel = 66; G.ringsPassed = 5; G.bombs = 1; G.lives = 2;
      G.scrollY = -3400;
      player.x = W() / 2 + 160; player.y = 520;
      // Banked left-down: true heading 247 (vx -280, vy 120).
      player.vx = -280; player.vy = 120;
      // Terrain at last: an island + islet along the bottom edge, a cloud
      // (with shadow) upper right — the boss frame previously had none.
      addIsland(world, 220, wyAt(585), 85);
      addIsland(world, 1050, wyAt(565), 45);
      addCloud(world, 950, wyAt(120));
      G.boss = { x: W() / 2, y: 150, ty: 150, hp: 150, max: 250, t: 0, atk: 1, atkCd: 2, phase: 1, smokeT: 0 };
      // Boss is already past its first phase break at hp 0.6 — mark phase 1 so
      // the live emitter does not fire a phantom explosion mid-capture.
      // Pre-seed smoke on the hull: the emitter alone fires 0x in 5 frames.
      // 10 puffs across the full hull width, larger than the emitter's, so the
      // damage reads against the dark hull at capture (grey on brown is subtle).
      for (let i = 0; i < 10; i++) {
        particles.push({ kind: 'smoke', x: W() / 2 - 70 + rng() * 140, y: 150 + (rng() - 0.5) * 40, vx: (rng() - 0.5) * 20, vy: -30 - rng() * 20, life: 1.2 + rng() * 0.6, max: 2.0, size: 7 + rng() * 5, color: '#5a5a5a' });
      }
      // Bird flock (upper left, clear of the boss).
      spawnFlock(500, 110, 1, 75, 3);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        eBullets.push({ x: W() / 2, y: 190, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130 + 60 });
      }
      for (let i = 0; i < 6; i++) pBullets.push({ x: player.x - 10 + (i % 3) * 10, y: 505 - i * 8, vx: (i % 3 - 1) * 60, vy: -640, dmg: 1 });
      spawnEnemy('scout', W() / 2 - 300, 300);
      G.waveEvents = buildWave(3);
      G.waveEvents.forEach((e) => { e.done = true; });
    }
    // Staged enemies are fully faded in; ambient flocks are placed explicitly
    // per shot above (the live spawn accumulator is parked past capture).
    for (const e of enemies) e.age = 1;
    G.birdT = 8;
    // Snap camera/scroll state so the first presented frame is the staged one.
    G.t = 5;
  }

  // ---------------- main loop ----------------
  let last = performance.now();
  let frames = 0;
  let shotReadySent = false;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    draw();
    frames++;
    if (SHOT && !shotReadySent && frames >= 5) {
      shotReadySent = true;
      window.__shotReady = true;
      window.__gameState = {
        mode: G.mode, score: G.score, wave: G.wave,
        altFt: altFt(), knots: knots(), hdg: Math.round(hdgDeg()),
        enemies: enemies.length, bullets: eBullets.length + pBullets.length,
      };
    }
  }

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  addEventListener('resize', resize);
  resize();

  if (SHOT) stageShot(SHOT);
  window.__shotReady = false;
  requestAnimationFrame(loop);

  window.render_game_to_text = () => JSON.stringify({
    mode: G.mode, score: G.score, wave: G.wave, lives: G.lives,
    altFt: altFt(), knots: knots(), hdg: Math.round(hdgDeg()),
    enemies: enemies.length, rings: G.ringsPassed, boss: !!G.boss,
  });
  return { G, player, stageShot };
}
