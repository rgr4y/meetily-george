# Task 0.5: Update Frontend Dependencies

status: done
completed: 2026-04-15
epic: none
depends_on: none
blocks: all other epics

## What

Bring frontend dependencies up to date before starting feature work. Catch any breaking changes now rather than mid-epic.

## Why

- Next.js 14 → 15 is available and includes meaningful perf/RSC improvements
- React 18 → 19 is stable; several deps already ship React 19-compatible versions
- `framer-motion` has been superseded by `motion` package
- `lucide-react` version is several releases behind (new icons needed for Epic 1–4 UI)
- `@tauri-apps/*` plugins should track the same minor version to avoid IPC mismatches
- Doing this now avoids mid-epic dep conflicts

## Where

- `frontend/package.json`
- `frontend/pnpm-lock.yaml`
- `frontend/next.config.js` — may need updates for Next 15
- `frontend/tailwind.config.js` — Tailwind 4 is available if worth the jump

## Current pinned versions (as of task creation)

| Package | Current | Notes |
|---|---|---|
| `next` | ^14.2.25 | Next 15 stable |
| `react` / `react-dom` | ^18.2.0 | React 19 stable |
| `typescript` | ^5.9.3 | up to date |
| `tailwindcss` | ^3.4.1 | v4 is a significant rewrite — evaluate separately |
| `framer-motion` | ^11.15.0 | Renamed to `motion`; API mostly compat |
| `lucide-react` | ^0.469.0 | check latest |
| `@tauri-apps/api` | ^2.10.1 | check for 2.x patch updates |
| `@tauri-apps/cli` | ^2.1.0 | keep in sync with api |
| `@blocknote/*` | 0.36.0 | unpinned — check for patch releases |

## Steps

1. **Check outdated packages**:
   ```bash
   cd frontend && pnpm outdated
   ```

2. **Update patch/minor versions** (safe) — run:
   ```bash
   pnpm update
   ```
   This respects semver ranges. Commit after verifying build passes.

3. **Evaluate Next 15 upgrade**:
   - Review [Next.js 15 migration guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
   - Key breaking changes: `params` and `searchParams` are now async in page components; `fetch` caching defaults changed
   - Update any page components that destructure `params` / `searchParams` directly
   - Update `next.config.js` if needed

4. **Evaluate React 19 upgrade** (do after Next 15 if upgrading both):
   - React 19 removes `ReactDOM.render`, `string refs` — unlikely to affect this codebase
   - Check `@types/react` and `@types/react-dom` bump too

5. **Tailwind 4** — **defer for now**. v4 is a full config rewrite (no more `tailwind.config.js`, PostCSS-based). Not worth the disruption before feature work.

6. **After each major bump** — run the dev build and verify:
   ```bash
   pnpm run dev
   ```
   Then open the Tauri app:
   ```bash
   ./clean_run.sh
   ```
   Fix any TypeScript errors or runtime warnings before proceeding.

7. **Commit separately** — one commit per major version bump (Next, React, Tauri) so regressions are bisectable.

## Done When

- `pnpm outdated` shows no available patch/minor updates for key packages
- Next.js and React versions decided (upgraded or explicitly deferred with reason)
- `pnpm run dev` starts without errors
- `./clean_run.sh` launches the desktop app without errors
- `cargo check` still passes (dep updates are JS-only, but verify)
