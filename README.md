# Kelana Strike

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/meongs123/best-flight-game-20261126-entry/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/meongs123/best-flight-game-20261126-entry/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Entry for the [make.fun](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) bounty **"Make the best flight game"** (`best-flight-game-20261126-0057`).

An original top-down vertical-scrolling shoot-em-up in the Raiden / 1942 arcade
tradition. You fly the **Kelana-9** interceptor off runway 07 on a home island,
then climb the **Laut Biru island chain**: blast through enemy squadrons, thread
glowing mission rings for bonuses and fuel, grab power-ups (up to 3-way spread,
shield, bombs), and take down the **Benteng Terbang** flying fortress every third
wave. Arcade rules throughout: 3 ships, hi-score table, and a backlit instrument
strip with altitude, speed and heading gauges.

## How to play

- **Arrows / WASD** — fly. **Mouse** — steer (move) and fire (hold click).
- **Z / Space** — fire. **X** — bomb (clears the sky, 3 to start).
- **P** — pause. **M** — sound on/off. **R** — fly again after mission over.
- Fly through the golden rings for +500 and a full fuel tank; six rings in a set
  pays +2000. Enemy drops: **P** weapon up, **S** shield, **B** bomb, **1UP** extra
  ship. Losing a ship costs one weapon level.

## Play it

Serve `game/` with any static server and open `game/index.html` in a desktop browser (no network needed):

```
node serve.ts
# open http://localhost:8080
```

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

All art is drawn in code (Canvas 2D vector sprites, procedural islands, clouds and
sea). All sounds are synthesized (WebAudio). No image, audio, or font files; no
network requests; no eval; no service worker; no cookies.
