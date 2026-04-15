# Task 4.4: Frontend Meeting Detection Indicator + Settings

status: pending
epic: task-meeting-detection-4.0.md
depends_on: task-meeting-detection-4.3.md

## What

Show meeting detection status in the UI. Add settings toggle for auto-detection.

## Where

- `frontend/src/app/page.tsx` or recording controls area — detection indicator
- `frontend/src/app/settings/` — add toggle
- `frontend/src/contexts/` — new or updated context for detection state

## Steps

1. **Listen for detection events** — subscribe to `meeting-detected` Tauri event:
```typescript
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = listen<{ is_active: boolean; platform: string | null }>('meeting-detected', (event) => {
    setMeetingDetected(event.payload.is_active);
    setPlatform(event.payload.platform);
  });
  return () => { unlisten.then(fn => fn()); };
}, []);
```

2. **Detection indicator** — when meeting detected and auto-recording:
   - Show a subtle banner or badge: "📹 {Platform} meeting detected — recording automatically"
   - Use existing notification/toast system (sonner) or inline indicator
   - When meeting ends: brief "Meeting ended — processing transcript..."

3. **Settings toggle** — in the Settings page (General or Recordings tab):
   - "Auto-detect meetings" toggle (switch component)
   - Description: "Automatically start recording when a video call is detected (Zoom, Teams, WebEx)"
   - Read/write via settings repository (invoke `api_save_settings` or similar)
   - On non-macOS: render the toggle as **disabled** with label "macOS only — coming soon". Do not hide it or change any existing non-macOS settings UI.

4. **Update ConfigContext** — add `autoDetectMeetings` to config state so components can check it.

## Done When

- Meeting detection status visible in UI when active
- Platform name shown when detected
- Settings toggle enables/disables auto-detection
- Settings persisted to database
- On non-macOS: toggle visible but disabled with "macOS only" label — no other changes to existing settings UI
