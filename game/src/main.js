// main.js — Kelana Strike bootstrap. Full-window canvas, one rAF loop.
import { createGame } from './game.js';

const canvas = document.getElementById('game');
const errBox = document.getElementById('err');
window.addEventListener('error', (e) => {
  errBox.style.display = 'block';
  errBox.textContent = 'ERR: ' + (e.error?.message || e.message || e);
});

try {
  createGame(canvas);
} catch (e) {
  errBox.style.display = 'block';
  errBox.textContent = 'ERR: ' + (e && e.message ? e.message : e);
  console.error(e);
}
