# Task: Theme Import Audio Modal for Dark/Light

status: pending
epic: none
depends_on: none

## What

The "Import Audio" modal (file picker + meeting title + advanced options) has a white/light background that doesn't respect dark mode. Convert to semantic color tokens so it matches the rest of the app in both themes.

## Where

- Find the import audio modal component (likely in `frontend/src/components/` — search for "Import" or "Choose Different File")
- Apply semantic dark mode classes (`bg-surface`, `text-foreground`, etc.) consistent with the theme system from Epic 0 (theme infrastructure)

## Screenshot

See `.claude/image-cache/6c8b6713-f801-4c6a-b8d6-8e5d68cb79ae/19.png`
