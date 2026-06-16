# Calm Safe City — project status

Last updated: **2026-06-12** · `main` at **`c9c4e5a`** (*Add water build tool for ponds and lakes*)

This file is the handoff snapshot for humans and AI agents. Pair it with `AGENTS.md`, `CLAUDE.md`, and `README.md`.

## Product

| | |
|---|---|
| **Public name** | Calm Safe City |
| **Internal codename** | Aster Bay |
| **Repo** | [github.com/nipez/aster-bay](https://github.com/nipez/aster-bay) |
| **Live site** | [calmsafecity.com](https://calmsafecity.com) — marketing at `/`, game at `/play/` |
| **GitHub Pages path** | `/aster-bay/play/` — always use **relative** links (`play/`, not `/play/`) |
| **Audience** | Kids & families (E-rated). No chat, no IAP, no dark themes. |
| **Deploy** | Push to `main` → `.github/workflows/static-pages.yml` (static artifact, entire repo root) |

### Naming note (not decided)

User discussed rebranding to **Calm City Builder** (`calmcitybuilder.com` available) while keeping `calmsafecity.com` as redirect. **No rebrand committed** — product copy still says Calm Safe City.

## Architecture today (Phase 1)

```
index.html                  Marketing landing page
play/index.html             Entire game (~4600 lines, one <script>, zero deps)
play/manifest.webmanifest   PWA manifest
assets/screenshots/         Real gameplay captures (PNG + WebP)
scripts/dev.js              Local static server (port 5173)
scripts/capture-screenshots.js   Refresh marketing shots (needs puppeteer + sharp)
tests/run.js                Headless regression suite
supabase/schema.sql         Ready for future cloud saves — not wired yet
CLAUDE.md                   Internal map of play/index.html sections
```

**Phase 2 (not started):** Vite split into `src/sim/`, `src/render/`, `src/ui/`. Until then, keep the game playable as a single `play/index.html` with no external scripts/fonts/CDNs.

## What is shipped on `main`

### Kid-first defaults (`UX` object in `play/index.html`)

```javascript
const UX = {
  interior: false,      // building interiors hidden
  mobStick: false,      // mobile placement stick hidden
  buildOkToasts: false, // no toast on every successful build
  money: false,         // no $ UI; creative-style free builds
};
```

Internal `COST` / `spend()` still exist for tests and future mayor mode. Player-facing pricing was removed.

### Boot URL parameters

| Param | Effect |
|---|---|
| `?mode=creative` | Sandbox: free builds, fires blocked regardless of events toggle |
| `?mode=mayor` | Economy + fires enabled (when not in creative) |
| `?calm=1` | Creative + fires off + 30 min session default |
| `?city=big` | Spread multi-district big city layout |
| `?view=1#city=<base64>` | View-only shared city (no building; loads from hash) |

**Family deep link:** `play/?mode=creative&calm=1`

### Parent / calm controls

- Panel: stats drawer → **Parent settings**
- Persisted in `localStorage` key `csc-parent-v1`
- Options: session timer (default 30 min), dusk “Save & rest” prompt, creative-only lock, fires-off default, optional 4-digit PIN
- View-only share: in-game **Share view link** → `?view=1#city=…` (size cap `SHARE_MAX_URL`)

### Build tools (dock)

Inspect, Find (spot people/pets), Road (water → bridge), Housing, Shop, Fire station, School, District expand, Park, **Water** (ponds/lakes), Tree, Blocks, Bulldoze.

Also: Big city button, Fires on/off (mayor), Save/Load JSON, Undo (creative, last 20 actions).

### Simulation highlights

- Infinite procedural world (`tileAt` / sparse `edits`, no dense grid)
- Named walkers with text commands (`Nora - go to fire station`)
- Cars, traffic lights, pedestrians, day/night, fires + coverage, schools, milestones
- Road congestion hooks exist (`roadCong`, `congestionPenalty`) — polish/backlog item
- Mobile: unified bottom dock, 52px targets, always expanded on narrow screens

### Marketing site

- Real screenshots in `assets/screenshots/`
- “For parents” section vs Roblox/Minecraft
- CTAs to calm creative link
- OG image: `assets/screenshots/city-overview.webp`

## Save format (v4 — sparse)

Only player edits persist; terrain is procedural. Full schema in `README.md`.

**Rules:** bump `v` on schema change; keep import paths for v2/v3 dense grids; never break compatibility silently. Primary persistence is export/import JSON today — **not** `localStorage` (except parent settings).

## Quality gate

```bash
node tests/run.js    # must pass before any change is done
node scripts/dev.js  # optional local preview at http://localhost:5173
```

Tests extract `<script>` from `play/index.html`, stub DOM/canvas, drive `requestAnimationFrame` manually. New internals → add to hook list in `tests/run.js` (`global.__h`), not exported from the game file.

## Backlog (priority order)

1. **Phase 2 — Vite split** — sim/render/ui modules; port tests to import sim directly; ship built single-file artifact
2. **Supabase** — magic-link auth, `cities` upsert/select, autosave each game day, `scores` leaderboard (`supabase/schema.sql` ready)
3. **Traffic congestion polish** — rolling occupancy already partially wired; slow cars + happiness penalty
4. **Land value / pollution** — shops/traffic emit, parks absorb, gates building height
5. **Offline progression** — Railway cron (“earned while away”)
6. **Domain / product naming** — Calm City Builder vs Calm Safe City (discussion only)
7. ~~Creative mode~~ · ~~`?mode=creative`~~ · ~~undo stack~~ · ~~bridges~~ · ~~big city~~ · ~~water tool~~ · ~~view-only share links~~ · ~~parent settings~~ — **shipped**

## Recent commit trail (newest first)

| Commit | Topic |
|---|---|
| `c9c4e5a` | Water build tool (ponds/lakes; bulldoze fills; roads → bridges on water) |
| `5ca0730` | Removed player-facing pricing |
| `7712f7b` | Test stabilization (pause btn, walkers) |
| `fa696a5` | Kid-friendly mobile bottom nav |
| `b78d8f4` | Parent calm controls, session timer, view-only share |
| `4a9f176` | Marketing screenshots from real gameplay |

## How to continue the build

1. Read `CLAUDE.md` for the `play/index.html` section map and hard rules.
2. Read `AGENTS.md` for branch naming, PR workflow, and test hooks.
3. Pick a backlog item; create branch `cursor/<short-name>-cd86`.
4. Implement; extend `tests/run.js` when adding systems.
5. Run `node tests/run.js` — all green before merge.
6. Push; open PR to `main`; merge deploys to calmsafecity.com automatically.

**User shorthand:** “m and p” = merge to `main` and push `origin/main`.
