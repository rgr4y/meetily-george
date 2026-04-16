# Task: macOS `apfel` Title Generation for Built-in AI

status: pending
epic: none
depends_on: none

## What

Implement the macOS-only `apfel` title-generation path for `builtin-ai`, with safe fallback to the existing local summary-sidecar path when the host, OS version, or framework checks do not pass.

## Why

- `apfel` is a better fit for short, low-context title-generation tasks than the full built-in summary pipeline
- Apple-native capabilities should be used when the runtime supports them
- The existing summary-body generation path must remain unchanged

## Source of Truth

- `.omx/plans/builtin-ai-apfel-title-generation-spec.md`

## Where

- `frontend/src-tauri/src/summary/`
- `frontend/src-tauri/src/summary/summary_engine/`
- `frontend/src/hooks/meeting-details/useSummaryGeneration.ts`
- `frontend/src/app/meeting-details/page.tsx`
- any UI surface that needs missing-install guidance

## Implementation Plan

1. Add runtime capability helpers.
   - Detect macOS version and compare against the required threshold.
   - Detect Apple Foundation framework availability.
   - Detect whether `apfel` is installed and executable.

2. Add a dedicated title-generation module for built-in AI.
   - Prefer `apfel` when all gates pass.
   - Fall back to the existing built-in local path when any gate fails.
   - Return the chosen source for logs and analytics.

3. Implement safe `apfel` execution.
   - Spawn `apfel` directly with `Command`.
   - Avoid shell interpolation.
   - Enforce a timeout.
   - Capture stdout and stderr.
   - Guard against prompts that exceed the `4096` token budget.

4. Wire the selector into title generation only.
   - Do not change the summary-body generation path.
   - Preserve current `llama-helper` behavior for full summaries.

5. Add user-facing fallback messaging.
   - If `apfel` is supported by the host but not installed, fall back and show install guidance.
   - Mention Homebrew and source-build installation options.

6. Add tests and verification.
   - macOS version gating
   - Apple Foundation availability gating
   - missing `apfel` fallback
   - token-budget rejection
   - provider selection / source metadata

## Likely Files

- `frontend/src-tauri/src/summary/title_generation/mod.rs`
- `frontend/src-tauri/src/summary/title_generation/platform.rs`
- `frontend/src-tauri/src/summary/title_generation/provider.rs`
- `frontend/src-tauri/src/summary/title_generation/apfel.rs`
- `frontend/src-tauri/src/summary/commands.rs`
- `frontend/src-tauri/src/summary/service.rs`
- `frontend/src/hooks/meeting-details/useSummaryGeneration.ts`
- `frontend/src/app/meeting-details/page.tsx`
- `frontend/src/components/MeetingDetails/SummaryGeneratorButtonGroup.tsx`
- `frontend/src/components/MeetingDetails/SummaryUpdaterButtonGroup.tsx`

## Verification

- Run the relevant Rust tests for the new title-generation module.
- Run the frontend typecheck / build if hooks or UI code change.
- Manually verify fallback behavior on an unsupported host or mocked gate.
- Confirm the existing `llama-helper` summary-body path still behaves the same.

## Done When

- `builtin-ai` on supported macOS uses `apfel` for title generation.
- Fallback works when `apfel` is missing or unsupported.
- The existing built-in summary body path still uses `llama-helper`.
- Tests cover the gate and fallback branches.
