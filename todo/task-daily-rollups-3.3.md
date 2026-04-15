# Task 3.3: Frontend Daily Digest View

status: pending
epic: task-daily-rollups-3.0.md
depends_on: task-daily-rollups-3.2.md

## What

Add a "Daily Digest" section to the UI. Show today's rollup (if generated) with a button to generate/regenerate. List recent dailies.

## Where

- `frontend/src/components/` — new `DailyDigest/` directory
- `frontend/src/components/Sidebar/` — add daily digest link/section
- `frontend/src/app/` — new page or section in existing layout

## Steps

1. **DailyDigest component** `frontend/src/components/DailyDigest/DailyDigestView.tsx`:
   - Header with date and "Generate Digest" / "Regenerate" button
   - If digest exists: render structured sections (summary, key themes, aggregated action items, decisions)
   - Meeting count and total duration stats
   - If no digest: show prompt to generate with meeting count for today
   - Loading state during generation

2. **Sidebar entry** — add a "Daily Digest" item in the sidebar (above or below meeting list). Could be an icon + "Today's Digest" link. Badge showing meeting count.

3. **Data fetching**:
```typescript
// Fetch existing rollup
const rollup = await invoke<DailyRollup | null>('api_get_daily_rollup', { date: todayStr });

// Generate on button click
const newRollup = await invoke<DailyRollup>('api_generate_daily_rollup', { date: todayStr });
```

4. **Type definition**:
```typescript
interface DailyRollup {
  id: string;
  date: string;
  summary: string;
  key_themes: string | null;
  action_items: string | null;
  decisions: string | null;
  meeting_count: number;
  total_duration_seconds: number;
  created_at: string;
  updated_at: string;
}
```

5. **Render logic** — parse JSON strings from `key_themes`, `action_items`, `decisions` into arrays client-side. Reuse the `StructuredSummaryView` component from Epic 1 if possible (adapt for themes vs key_points).

## Done When

- Daily Digest view renders with structured sections
- Generate/regenerate button works
- Sidebar has entry point to daily digest
- Handles empty state (no meetings today) gracefully
