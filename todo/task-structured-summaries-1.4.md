# Task 1.4: Frontend UI for Structured Summary Display

status: done
completed: 2026-04-15
epic: task-structured-summaries-1.0.md
depends_on: task-structured-summaries-1.3.md

## What

Replace the freeform markdown summary display with structured sections: Summary, Key Points, Action Items, Decisions.

## Where

- `frontend/src/components/AISummary/` — summary display components
- `frontend/src/app/meeting-details/` — meeting detail page

## Steps

1. **Create `StructuredSummaryView` component** in `frontend/src/components/AISummary/StructuredSummaryView.tsx`:
   - Accepts `{ summary, keyPoints, actionItems, decisions }` props
   - Renders four collapsible sections:
     - **Summary** — paragraph text
     - **Key Points** — bulleted list with dot indicators
     - **Action Items** — checklist-style (checkbox icons, not interactive yet)
     - **Decisions** — bulleted list with distinct icon (gavel or checkmark)
   - Use existing Tailwind patterns from the codebase
   - Hide sections with empty arrays

2. **Fetch structured data** — in the meeting detail page or summary display, call `api_get_structured_summary` via `invoke()`:
```typescript
const result = await invoke<StructuredSummaryResponse>('api_get_structured_summary', { meetingId });
```

3. **Fallback** — if structured data is empty (old meetings), fall back to rendering the raw `summary` field as markdown (preserve existing behavior).

4. **Type definition** — add to types:
```typescript
interface StructuredSummaryResponse {
  summary: string;
  key_points: string[];
  action_items: string[];
  decisions: string[];
}
```

## Done When

- New component renders structured sections
- Old meetings still display their markdown summaries
- New summaries show structured view with all four sections
- UI looks clean with existing Tailwind theme
