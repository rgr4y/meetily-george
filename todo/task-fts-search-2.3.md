# Task 2.3: Frontend Search UI

status: pending
epic: task-fts-search-2.0.md
depends_on: task-fts-search-2.2.md

## What

Add a search input to the sidebar that queries meetings via FTS and displays results.

## Where

- `frontend/src/components/Sidebar/` — add search input
- New component: `frontend/src/components/Sidebar/SearchResults.tsx`

## Steps

1. **Add search input** to the sidebar (likely `SidebarProvider.tsx` or its child). Place above the meeting list:
   - Text input with search icon (use Lucide `Search` icon)
   - Debounce input by 300ms before querying

2. **Call Tauri command** on input change:
```typescript
const results = await invoke<SearchResult[]>('api_search_meetings', { query, limit: 20 });
```

3. **SearchResults component** — renders when query is non-empty, replaces meeting list:
   - Each result shows: meeting title, snippet (with `<mark>` tags rendered as highlights), date
   - Click navigates to meeting detail
   - "X results found" header
   - Empty state: "No results for '{query}'"

4. **Clear behavior** — when search input is cleared, show normal meeting list again.

5. **Type definition**:
```typescript
interface SearchResult {
  meeting_id: string;
  meeting_title: string;
  snippet: string;
  match_field: string;
  rank: number;
  created_at: string;
}
```

## Done When

- Search input appears in sidebar
- Typing triggers debounced FTS query
- Results display with highlighted snippets
- Clicking a result navigates to meeting
- Clearing search restores meeting list
