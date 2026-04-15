# Meetily Feature Integration — Orchestrator

You are a task orchestrator running on `/loop`. Your job is to work through the task files in this `todo/` directory, one at a time, until all are complete.

## How This Works

Each epic is numbered `task-{name}-{N}.0.md` (the epic overview). Sub-tasks are `task-{name}-{N}.1.md`, `task-{name}-{N}.2.md`, etc. Work sub-tasks in order within each epic. Work epics in numeric order.

## Loop Protocol

On each iteration:

1. **Scan** — Read every `.md` file in `todo/` (except this one). Look for the `status:` field in each file's frontmatter.
2. **Find next work** — Pick the lowest-numbered sub-task with `status: pending`. Skip `.0` files (those are epic overviews, not actionable). If a task has `status: blocked`, check if its blocker is now resolved.
3. **Execute** — Follow the task spec exactly. The spec tells you what files to create/modify, what patterns to follow, and what "done" looks like.
4. **Mark complete** — When done, edit the task file: change `status: pending` to `status: done` and add a `completed: YYYY-MM-DD` line.
5. **Verify** — If the task says to run tests or build, do it. If it fails, fix it before marking done.
6. **Report** — Briefly say what you did and what's next.

## Rules

- One sub-task per loop iteration. Don't batch.
- Read the `.0` epic overview before starting any sub-task in that epic — it has context.
- Don't modify task specs unless marking status.
- If you hit a wall after 2 serious attempts, change the task status to `status: stuck` with a `stuck_reason:` field explaining why, then move to the next task.
- If ALL tasks are `done` or `stuck`, say "All tasks processed." and stop looping.
- Follow existing codebase patterns. Read surrounding code before writing new code.
- Commit after each completed sub-task with a descriptive message. `sleep 1` before `git commit`.

## Epic Order

1. **Structured Summaries** (task-structured-summaries-1.*) — Lowest effort, high value
2. **FTS Search** (task-fts-search-2.*) — Low effort, enables future features
3. **Daily Rollups** (task-daily-rollups-3.*) — Low effort, cross-session intelligence
4. **Meeting Detection** (task-meeting-detection-4.*) — Medium effort, killer UX
5. **Context Capture** (task-context-capture-5.*) — Medium effort, enriches summaries
6. **Speaker Diarization** (task-diarization-6.*) — High effort, major differentiator

## Codebase Orientation

- Rust backend: `frontend/src-tauri/src/`
- React frontend: `frontend/src/`
- Python backend: `backend/app/`
- Tauri commands registered in: `frontend/src-tauri/src/lib.rs`
- DB migrations: `frontend/src-tauri/migrations/`
- DB models: `frontend/src-tauri/src/database/models.rs`
- DB repos: `frontend/src-tauri/src/database/repositories/`
- Summary system: `frontend/src-tauri/src/summary/`
- Audio system: `frontend/src-tauri/src/audio/`
- LLM client: `frontend/src-tauri/src/summary/llm_client.rs`
- Summary processor: `frontend/src-tauri/src/summary/processor.rs`
