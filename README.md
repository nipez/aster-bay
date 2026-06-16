# Calm Safe City 🏙️

A calm, kid-safe isometric city-builder that runs entirely in the browser. One HTML file for the game (`play/index.html`), vanilla JavaScript, zero runtime dependencies, canvas-rendered. Build roads, zone housing and shops, paint ponds, stack Minecraft-style blocks, add named walkers, and watch a cozy town live through a full day/night cycle.

**Marketing site:** [calmsafecity.com](https://calmsafecity.com) (root `index.html`)  
**Play the game:** `play/` — on GitHub Pages: `/aster-bay/play/`  
Use **relative** links (`play/`, not `/play/`) so CTAs work on both the custom domain and `github.io/aster-bay`.

**Quick start for families:** [play/?mode=creative&calm=1](play/?mode=creative&calm=1)

## Features

- **Infinite world** — procedural meadows, forests, and lakes in every direction; only player edits are saved (sparse v4 format)
- **Creative-first UX** — free builds by default, no money HUD; optional mayor mode via `?mode=mayor`
- **Parent controls** — session timer, dusk “Save & rest”, optional PIN, creative-only lock (stats panel → Parent settings)
- **View-only sharing** — share a read-only city link (`?view=1#city=…`) with grandparents or friends
- **Named walkers** — add family members; text commands like `Nora - go to fire station`
- **Find game** — spot hidden people and pets around the city
- **Living simulation** — pedestrians, right-hand traffic, auto traffic lights at intersections
- **Day/night cycle** — sun/moon, lit windows, streetlamps, headlights
- **Build tools** — road (bridges over water), housing, shop, fire station, school, district expand, park, water, tree, blocks, bulldoze
- **Big city** — multi-district spread layout with road-linked hubs (`?city=big` or in-game button)
- **Creative undo** — last 20 build actions in creative mode
- **Fires & civics** — fire spread when uncovered; station/school coverage radii; calm mode disables random events
- **Minecraft-style blocks** — stack colored cubes (max 14); bulldozer pops one at a time
- **Save/load** — JSON export/import (v4 sparse; v2/v3 still import)
- **Mobile friendly** — touch pan/pinch, unified bottom tool dock, tap-to-build, tap-to-inspect

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Pan | drag | one-finger drag |
| Zoom | scroll wheel / +,− | pinch / buttons |
| Build | pick tool, click tile | pick tool, tap tile |
| Inspect | hover people/cars, click buildings | tap anything |
| Pause | Space or button | button |
| Cancel tool | Esc | tap Inspect |

## Boot URL parameters

| Param | Effect |
|---|---|
| `?mode=creative` | Free sandbox builds |
| `?mode=mayor` | Economy + random fires (when enabled) |
| `?calm=1` | Creative + fires off + gentle session defaults |
| `?city=big` | Start with spread multi-district layout |
| `?view=1#city=<data>` | View-only shared city |

## Repo layout

```
index.html                      marketing landing page
play/index.html                 the entire game (see CLAUDE.md)
play/manifest.webmanifest       PWA manifest
assets/screenshots/             real gameplay captures
scripts/dev.js                  local static server (port 5173)
scripts/capture-screenshots.js  refresh marketing shots (dev-only deps)
supabase/schema.sql             cloud saves + leaderboard schema (future)
tests/run.js                    headless regression suite
PROJECT.md                      handoff status snapshot for AI/humans
AGENTS.md                       agent workflow + rules
CLAUDE.md                       internal map of play/index.html
.cursorrules                    Cursor-specific rules
CNAME                           custom domain hint (calmsafecity.com)
.github/workflows/static-pages.yml
```

## Local development

```bash
node scripts/dev.js          # http://localhost:5173 — marketing at /, game at /play/
node tests/run.js            # headless regression suite (required before merge)
```

Refresh marketing screenshots (optional, installs puppeteer + sharp temporarily):

```bash
npm install --no-save puppeteer sharp
node scripts/capture-screenshots.js
```

## Testing

No browser needed — the suite stubs the DOM/canvas and drives the game loop manually:

```bash
node tests/run.js
```

It verifies placement rules, traffic lights, fires, economy, walkers, parent/share flows, big city layout, undo, bridges, water tool, save round-trips (v4/v3/v2), and more. New systems should extend the hook list in `tests/run.js`.

## Roadmap

See **`PROJECT.md`** for the full shipped vs backlog snapshot. Priority next steps:

1. **Phase 2 — Vite modularize** — split into `src/sim`, `src/render`, `src/ui`; keep a built single-file artifact
2. **Supabase** — auth, cloud saves (`cities`), leaderboard (`scores`); schema in `supabase/schema.sql`
3. **Traffic congestion polish** — per-road occupancy affecting speed and happiness
4. **Land value / pollution** — shops/traffic emit, parks absorb
5. **Offline progression** — Railway cron for “earned while away”

Already shipped: creative mode, `?mode=creative`, undo stack, bridges, big city, water tool, parent settings, view-only share links, mobile dock, hidden player pricing.

## Save format (v4 — sparse)

The world is procedural terrain everywhere; only changes are saved.

```json
{
  "v": 4, "mode": "mayor|creative", "citySize": "normal|big",
  "cash": 0, "day": 1, "simClock": 0,
  "eventsOn": true, "rankIdx": 0,
  "districts": [[x0,y0,x1,y1]],
  "edits": [["x,y", "road|xing|walk|grass|lot|water|bridge|..."]],
  "removedTrees": ["x,y"], "parks": ["x,y"], "scorch": ["x,y"],
  "blocks": [{ "x":0, "y":0, "colors": ["#hex"] }],
  "buildings": [{ "x":0,"y":0,"use":"res|com|civic","kind":null, "...": "..." }],
  "trees": [{ "x":0.5,"y":0.5,"s":1 }],
  "walkers": [{ "name":"Alex", "fx":12, "fy":10, "...": "..." }],
  "findFound": ["goal-id"]
}
```

v2/v3 dense-grid saves convert to sparse edits on import. This blob is the unit of persistence — file export today, Supabase `jsonb` tomorrow.

## Custom domain (GitHub Pages)

1. Repo **Settings → Pages → Custom domain** → `calmsafecity.com` → enforce HTTPS.
2. DNS: apex A records to GitHub Pages (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`); `www` CNAME to `<user>.github.io`.
3. Root `CNAME` file is set to `calmsafecity.com`.

Deploys on every push to `main` via `.github/workflows/static-pages.yml`.

## AI / agent handoff

New Cursor or Codex session? Read **`PROJECT.md`** (status), **`AGENTS.md`** (workflow), **`CLAUDE.md`** (code map), and **`.cursorrules`**.
