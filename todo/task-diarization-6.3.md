# Task 6.3: Frontend Speaker Display in Transcript

status: pending
epic: task-diarization-6.0.md
depends_on: task-diarization-6.2.md

## What

Show speaker labels in the transcript UI. Group consecutive segments by speaker. Visual distinction between speakers.

## Where

- `frontend/src/components/` — transcript display components
- Check for existing transcript rendering (likely in meeting details or main page)

## Steps

1. **Find transcript rendering** — locate where `TranscriptSegment` or transcript text is displayed. Likely in components related to `TranscriptPanel`, meeting details, or the main recording page.

2. **Update transcript type** to include speaker:
```typescript
interface TranscriptSegment {
  // ... existing fields ...
  speaker?: string;  // "Speaker 1", "You", "Speaker 2"
}
```

3. **Speaker grouping** — group consecutive segments with the same speaker:
```typescript
interface SpeakerGroup {
  speaker: string;
  segments: TranscriptSegment[];
  startTime: number;
  endTime: number;
}
```

4. **Speaker display component** — create or update transcript row rendering:
   - Show speaker label as a header for each group: **Speaker 1** or **You**
   - Color-code speakers (assign consistent colors — 4-5 distinct colors)
   - Left border or avatar-style indicator per speaker
   - Use Tailwind classes for colors: `border-l-4 border-blue-500`, `border-l-4 border-green-500`, etc.

5. **Color assignment** — map speaker labels to colors consistently:
```typescript
const SPEAKER_COLORS = ['blue', 'green', 'purple', 'orange', 'pink'];
function getSpeakerColor(speaker: string, speakerMap: Map<string, number>): string {
  if (!speakerMap.has(speaker)) speakerMap.set(speaker, speakerMap.size);
  return SPEAKER_COLORS[speakerMap.get(speaker)! % SPEAKER_COLORS.length];
}
```

6. **Fallback** — if `speaker` is null/undefined (old transcripts), render as before (no speaker labels, no grouping).

## Done When

- Transcript shows speaker labels with visual distinction
- Consecutive same-speaker segments grouped together
- Consistent color per speaker
- Old transcripts without speaker data still render normally
- Clean, readable UI
