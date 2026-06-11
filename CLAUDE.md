# CLAUDE.md — working notes for AI pair development

## What this project is

Aster Bay: a browser city-builder. Currently a single self-contained file (`index.html`) with zero dependencies. The long-term plan is a hosted web game: GitHub for source, Railway for the backend, Supabase for auth/saves/leaderboards. Owner: Nick (fast-moving, ship-oriented; prefers working increments over big rewrites).

## Hard rules

- `node tests/run.js` must pass before any change is considered done. Extend the suite when you add systems.
- Until Phase 2 (Vite split) is explicitly started, keep the game playable as a single `index.html` with no external scripts, fonts, or CDNs.
- Never break save compatibility silently. Current format is v4 (sparse `edits` over procedural terrain). If the schema changes, bump `v`, keep an import path for every previous version (v2/v3 dense grids convert on import), and update the README save-format section.
- Do not use `localStorage` for primary persistence — saves are explicit JSON export/import today, Supabase later.
- Keep it kid-safe (E rating): no violence beyond cartoon fires, no dark themes. The "Fires: off" calm mode must always fully disable random destructive events.

## Map of index.html

Everything lives in one `<script>`. Sections are delimited by `// ---------- name ----------` comments, in this order:

1. **canvas / rng / helpers** — seeded `mulberry32` RNG (`R()`), `hash(x,y,z)` for stable per-entity randomness, color utils with caching.
2. **world constants** — `GRID=33`, core city at tiles 4..28, roads every 6th core line. `iso(x,y,z)` projects tile→screen: `x=(tx-ty)*TW`, `y=(tx+ty)*TH - z`.
3. **infinite world** — there is NO tile array. `tileAt(x,y)` returns `edits.get(key)` if present, else deterministic procedural terrain (`terrainAt`: meadow/forest/lake from `noise2`, which MUST use `ihash` — the visual `hash()` loses float precision on large coords and skews the noise). All map mutations go through `setTile`/`clearTile` so they land in `edits` (the unit of persistence). Tile types: `road | xing | walk | grass | forest | lot | water`. Forest trees are procedural (`hasProcTree`), felled via the `removedTrees` set; planted trees live in `trees[]`.
4. **registries** — `buildings[]`, `trees[]` plus `bldMap`/`treeMap` keyed by `tkey(x,y)` for O(1) tile lookups. Always mutate through `addBuilding/removeBuildingAt/addTree/removeTreeAt` to keep them in sync.
5. **city generation** — deterministic from the fixed seed.
6. **traffic lights** — intersections recomputed from road adjacency (`refreshXingAt`, `rebuildLights`); a light exists at any `xing` with road-degree ≥ 3. Cycle: 8.4s green / 2.6s yellow per axis, phase-offset by coordinates.
7. **cars** — tile-to-tile movement with right-hand lane offset, per-(tile,direction) occupancy map to prevent rear-ending, red-light stop before entering an intersection tile.
8. **pedestrians** — walk on `walk` tiles (and park grass); cross roads only at crosswalk tiles adjacent to intersections (2-tile moves).
9. **economy & demand** — `recompute()` derives capacity/jobs/happiness/population/demand from world state; call it after any world mutation. `economyTick()` runs once per in-game day from `updateHUD()`.
10. **civic coverage · fires · milestones** — coverage is Euclidean tile distance (`FIRE_R=7`, `SCHOOL_R=6`). Fire lifecycle in `updateFires()`: covered → out in 4s; uncovered → spreads to adjacent buildings, destroys at 12s, leaves a `scorch` tile.
11. **build tools & modes** — `canPlace(tool,x,y)` is the pure validity check (also used for ghost preview); `tryPlace` mutates, charges via `spend()`, then `recompute()`. `mode` is `'mayor'|'creative'`: creative makes `spend()` free, skips `economyTick` money, and blocks random fires regardless of `eventsOn`. Blocks (`blocks[]`/`blockMap`) are color-cube stacks (max 14, `BLOCK_H` px each); the bulldozer pops one cube per tap.
12. **time / sky / ambience** — `simClock` drives everything; `DAY_LEN=150` real seconds per game day at 1×. `shade(hex, light)` applies face lighting + night/dusk ambient with caching — use it for ALL world colors so day/night stays consistent.
13. **camera / drawing / render** — `visibleRange()` computes the on-screen tile rect (capped at 150×150); ground, procedural forest trees, and entities are all culled to it. Ground pass first (flat, unsorted), then elevated objects depth-sorted by `x+y`. New drawable things must be pushed into the `items` list in `render()`. Road lane-markings iterate `edits` (roads only exist as edits), not the tile range.
14. **HUD / save / input / boot** — pointer events unify mouse+touch; `activePtrs` guards panning during pinch; tap-to-inspect on touch, hover on mouse.

## Testing pattern

`tests/run.js` extracts the `<script>` from `index.html`, stubs `window/document/canvas` with proxies, appends a `global.__h={...}` hook export, and drives `requestAnimationFrame` manually (33ms steps). To expose new internals to tests, add them to the hook list in `tests/run.js`, not to the game file.

## Backlog (in priority order)

1. **Phase 2 — Vite split**: `src/sim/` (tiles, agents, economy, fires — pure logic, no DOM), `src/render/`, `src/ui/`. Port tests to import sim modules directly. Keep a built single-file artifact as a deliverable.
2. **Supabase integration** (`supabase/schema.sql` is ready): magic-link auth, replace export/import with `cities` upsert/select, autosave every game day, `scores` upsert for the leaderboard. Env vars via `.env` (never commit keys).
3. **Traffic congestion**: per-road-tile rolling occupancy count; congested tiles slow cars and subtract happiness — makes road layout matter.
4. **Land value / pollution**: shops + traffic emit, parks absorb; value gates building height.
5. **Offline progression** (Railway cron) and shareable read-only city links.
6. ~~"Aster Bay Jr." config flag~~ — shipped as Creative mode in v0.5. Next: boot-time `?mode=creative` URL param so Calm Corner Games can deep-link straight into the sandbox.
7. **Block undo stack**: last-20-actions undo for creative mode (kids expect it).
8. **Bridges**: allow road placement on water at 3× cost with piling visuals.

## Conventions

- Vanilla JS, no semicolon-free style, 2-space indent.
- All randomness through `R()` (seeded) or `hash()` (stable) — never `Math.random()` — so cities are reproducible and tests stay deterministic.
- Costs/balance constants live in `COST` and the constants block; don't scatter magic numbers.
- Toast every player-facing state change (`toast(msg, 'ok'|'err')`).
