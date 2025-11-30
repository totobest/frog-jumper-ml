# Synaptic Frogger

A Phaser 3 + Synaptic neural-network experiment where a population of frogs learns to cross traffic. Neural nets control movement; fitness rewards forward progress, survival time, and staying near the center lane. Vite handles bundling and dev server.

## Quick start

1. Install dependencies: `npm install`
2. Run locally: `npm run dev` (Vite on http://localhost:5173)
3. Build for production: `npm run build` (output in `dist/`)

## Project layout

- `src/main.ts` wires Phaser into the DOM via Vite.
- `src/game/main.ts` sets up scenes; scenes live under `src/game/scenes/` (Boot, Preloader, MainMenu, Game, GameOver).
- `src/game/constants.ts` centralizes gameplay tuning (population sizes, mutation rates, dimensions, start positions).
- `public/assets/` contains art/audio (e.g., `spash.mp3`, car sprites, water frames); `public/style.css` has base styles.
- Vite configs: `vite/config.dev.mjs` and `vite/config.prod.mjs`.

## Gameplay loop (AI-driven)

- Each frog has a small neural net (Synaptic Perceptron) driving jumps based on simple sensors.
- Fitness combines vertical progress, survival time, and lateral positioning; top performers seed the next generation via crossover/mutation.
- Cars spawn in multiple lanes with varying speeds/directions; frogs die on collision (triggering a splash sound) and the generation restarts.

## Development notes

- TypeScript, strict mode, ES modules; four-space indentation, semicolons, and explicit imports with `.ts` suffixes for scenes.
- Manual test pass: load game, start from MainMenu, let a generation run, verify collisions, scoring, GameOver flow, and console is clean.
- Assets and new globals should be declared in `types.d.ts` or `src/vite-env.d.ts` if needed.

## Troubleshooting

- If assets fail to load, ensure the dev server root is the repo root so `public/assets/` is served at `/assets`.
- If audio doesn’t play, confirm the browser allows sound autoplay or interact once to unlock audio.
