# Aster Bay 🏙️

A cozy isometric city-builder that runs entirely in the browser. One HTML file, vanilla JavaScript, zero dependencies, canvas-rendered. Build roads, zone housing and shops, place fire stations and schools, manage a daily budget, and watch named little citizens and cars live their lives through a full day/night cycle.

**Play it:** open `index.html` in any modern browser. That's the whole game.

## Features (v0.5)

- **Infinite world**: the original town sits in procedurally generated wilderness — meadows, forests, and lakes in every direction, deterministic from coordinates, rendered with viewport culling
- **Creative mode**: one tap makes everything free, disables fires, and turns the game into a pure sandbox (the kid-friendly mode)
- **Minecraft-style blocks**: stack colored cubes up to 14 high with a 10-color palette — bulldozer pops one block at a time
- Living simulation: named pedestrians on sidewalks, named cars in right-hand lanes, working traffic lights that auto-form at new intersections
- Full day/night cycle: sun/moon arc, dawn/dusk tints, lit windows, streetlamp glow, headlights
- Build tools: road, housing, shop, park, tree, fire station, school, bulldoze — with cost, placement rules, and green/red ghost preview
- Economy: starting treasury, daily taxes per resident/job, road + civic upkeep
- R/C/G demand bars and a happiness score (greenery + jobs + school coverage) that drives occupancy and population
- Fires that spread if uncovered; fire station coverage radii with visual rings; calm-mode toggle to disable random events
- Milestone ranks (Hamlet → Metropolis) with council grants
- Save/load as JSON (sparse v4 format; v2/v3 saves still import)
- Mobile friendly: touch pan/pinch, tap-to-build, tap-to-inspect, responsive toolbars

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Pan | drag | one-finger drag |
| Zoom | scroll wheel / +,− | pinch / buttons |
| Build | pick tool, click tile | pick tool, tap tile |
| Inspect | hover people/cars, click buildings | tap anything |
| Pause | Space or button | button |
| Cancel tool | Esc | tap Inspect |

## Repo layout

```
index.html                  the entire game (see CLAUDE.md for an internal map)
demo/aster-bay-ambient.html v1 ambient sim (no gameplay) — kept as a reference/demo
supabase/schema.sql         cloud saves + leaderboard schema, ready to run
tests/run.js                headless regression suite (node tests/run.js)
CLAUDE.md                   working instructions for Claude Code / AI pair devs
```

## Testing

No browser needed — the suite stubs the DOM/canvas and drives the game loop manually:

```
node tests/run.js
```

It verifies road/building placement rules, traffic-light wiring, fire spread + coverage, school happiness bonus, the daily economy tick, milestone logic, and save round-trips (v3 + v2 backward compat).

## Roadmap

1. **Done — playable prototype** (this repo)
2. **Modularize:** Vite project, split `index.html` into `src/sim`, `src/render`, `src/ui` ES modules. Deploy static build (Cloudflare Pages or Railway static).
3. **Supabase:** auth + cloud saves (`cities` table) + public leaderboard (`scores` table). The game's `exportCity()`/`importCity()` already produce/consume a single JSON blob — swap the file download for a Supabase upsert. Schema in `supabase/schema.sql`.
4. **Railway backend:** Node/Hono API for server-validated leaderboard submissions and offline progression ("your city earned $31K while you were away") via a cron job.
5. **Social:** Supabase Realtime to visit friends' cities, weekly build challenges.

## Save format (v4 — sparse)

The world is procedural terrain everywhere; only changes are saved.

```json
{
  "v": 4, "mode": "mayor|creative",
  "cash": 0, "day": 1, "simClock": 0,
  "eventsOn": true, "rankIdx": 0,
  "edits": [["x,y", "road|xing|walk|grass|lot|water"]],
  "removedTrees": ["x,y"], "parks": ["x,y"], "scorch": ["x,y"],
  "blocks": [{ "x":0, "y":0, "colors": ["#hex", "..."] }],
  "buildings": [{ "x":0,"y":0,"use":"res|com|civic","kind":null,"capacity":0,"jobs":0, "...":"cosmetic fields" }],
  "trees": [{ "x":0.5,"y":0.5,"s":1 }]
}
```

v2/v3 dense-grid saves are converted to sparse edits on import.

This blob is the unit of persistence everywhere — file export today, Supabase `jsonb` column tomorrow.
