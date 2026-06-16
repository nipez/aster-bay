# Agent instructions — Calm Safe City / Aster Bay

For Cursor, Codex, Claude Code, or any AI pair dev. Read **`PROJECT.md`** first for current status, then **`CLAUDE.md`** for code map.

## Before you touch code

1. **Run tests:** `node tests/run.js` — baseline must pass on `main`.
2. **Read constraints:** single-file game (`play/index.html`), kid-safe, save v4 compat, no silent schema breaks.
3. **Scope:** smallest correct diff; match existing vanilla JS style (2-space indent, semicolons).

## Repository map

| Path | Role |
|---|---|
| `play/index.html` | Entire game (sim + render + UI in one `<script>`) |
| `index.html` | Marketing site |
| `tests/run.js` | Headless test harness + `global.__h` hooks |
| `CLAUDE.md` | Section-by-section map of `play/index.html` |
| `PROJECT.md` | Shipped vs backlog snapshot (update when status changes) |
| `README.md` | Public-facing overview |
| `supabase/schema.sql` | Future cloud saves (not integrated) |

## Hard rules (non-negotiable)

- **`node tests/run.js` must pass** before a task is done. Add tests when you add behavior.
- **Phase 1:** no Vite split unless explicitly requested. Keep `play/index.html` self-contained — no external scripts, fonts, or CDNs.
- **Save format v4:** sparse `edits`. Bump `v` + migration on change; update README save section.
- **No `localStorage` for game saves** — export/import JSON only (parent settings `csc-parent-v1` is the exception).
- **Kid-safe:** calm mode / creative mode must fully disable random destructive fires.
- **Randomness:** use seeded `R()` or stable `hash()` — never `Math.random()`.
- **Tile mutations:** always `setTile` / `clearTile` → `edits`. Buildings/trees via registry helpers only.
- **Economy:** call `recompute()` after world mutations.
- **Colors:** use `shade()` for all world drawing so day/night stays consistent.

## Cloud agent git workflow

Branch template: **`cursor/<descriptive-name>-cd86`** (lowercase, suffix `-cd86` required).

```bash
git checkout main && git pull origin main
git checkout -b cursor/my-feature-cd86
# … work …
node tests/run.js
git add -A && git commit -m "Clear message"
git push -u origin cursor/my-feature-cd86
# Open PR to main via ManagePullRequest tool
```

- Commit and push before considering work complete.
- Default PR base: **`main`**. Merging deploys GitHub Pages → calmsafecity.com.
- User may say **“m and p”** meaning merge to main and push.

## Testing pattern

`tests/run.js`:

1. Reads `<script>` from `play/index.html`
2. Stubs `window`, `document`, canvas, `localStorage`, `location`
3. Appends `global.__h = { … }` exporting internals
4. Steps simulation via manual `requestAnimationFrame` (~33 ms)

**To test new internals:** add symbols to the `hooks` string in `tests/run.js` — do not pollute the game with test exports.

Common hooks: `tryPlace`, `canPlace`, `importCity`, `exportCity`, `applyBootParams`, `instructWalker`, `resolveWalkerGoal`, `undoLastBuild`, `startBigCity`, `setViewOnly`, `getParentSettings`, etc.

## Key code locations (`play/index.html`)

| Topic | Search for |
|---|---|
| UX toggles | `const UX=` |
| Parent / calm / share | `DEFAULT_PARENT`, `shareViewUrl`, `loadShareFromHash` |
| Placement | `canPlace`, `tryPlace` |
| Boot params | `applyBootParams` |
| Walkers | `addWalker`, `instructWalker`, `parseWalkerCommand` |
| Save | `buildExportData`, `importCity` |
| Mobile dock CSS | `@media (max-width:1024px)` |

## Product defaults agents should know

- Default boot is **kid path**: `UX.money=false` → no money HUD, free builds.
- Marketing CTAs point to `play/?mode=creative&calm=1`.
- GitHub Pages lives under `/aster-bay/` — use relative URLs in HTML.
- Internal codename **Aster Bay** still appears in tests/comments; public name is **Calm Safe City**.

## When finishing a feature

1. Extend tests if behavior is new or regression-prone.
2. Run full suite.
3. Update **`PROJECT.md`** backlog/shipped table if status changed materially.
4. Update **`README.md`** only for user-visible feature changes.
5. Update **`CLAUDE.md`** backlog strikethroughs if applicable.
6. Commit, push, create/update PR.

## Do not

- Rewrite large subsystems without explicit ask.
- Add dependencies to the game runtime (Phase 1).
- Break v2/v3/v4 save import.
- Commit Supabase keys or `.env` secrets.
- Create markdown files the user did not ask for (except the maintained handoff set: PROJECT, AGENTS, README, CLAUDE, .cursorrules).
