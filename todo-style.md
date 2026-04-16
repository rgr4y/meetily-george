# Dark Mode — Remaining Hardcoded Colors

Files with hardcoded `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`, `text-slate-*`, `bg-slate-*` that need theme token conversion.

## Done
- [x] BuiltInModelManager.tsx
- [x] ConfirmationModel/confirmation-modal.tsx
- [x] Info.tsx (About button)
- [x] RecordingStatusBar.tsx
- [x] VirtualizedTranscriptView.tsx
- [x] RecordingControls.tsx
- [x] AudioLevelMeter.tsx
- [x] shared/DownloadProgressToast.tsx
- [x] lib/recordingNotification.tsx
- [x] MeetingDetails/SummaryGeneratorButtonGroup.tsx
- [x] MeetingDetails/TranscriptButtonGroup.tsx
- [x] dictation-widget/page.tsx
- [x] Toaster (layout.tsx) — added `theme="system"`
- [x] tauri.conf.json — removed hardcoded Light theme
- [x] ThemeContext.tsx — Tauri window theme sync, beta gate removed
- [x] betaFeatures.ts — darkMode graduated from beta

## Remaining — Core App (high visibility)

- [ ] **ImportAudio/ImportAudioDialog.tsx** (10 occurrences)
- [ ] **TemplateManagerDialog.tsx** (4)
- [ ] **ModelDownloadProgress.tsx** (3)
- [ ] **UpdateDialog.tsx** (4)
- [ ] **ComplianceNotification.tsx** (4)
- [ ] **RecordingSettings.tsx** (2)
- [ ] **TranscriptSettings.tsx** (1)
- [ ] **AudioBackendSelector.tsx** (2)
- [ ] **AnalyticsConsentSwitch.tsx** (1)
- [ ] **Sidebar/index.tsx** (2)
- [ ] **Logo.tsx** (1)
- [ ] **About.tsx** (1)
- [ ] **MeetingDetails/RetranscribeDialog.tsx** (2)

## Remaining — Secondary Pages

- [ ] **LanguageSelection.tsx** (5)
- [ ] **DatabaseImport/LegacyDatabaseImport.tsx** (6)
- [ ] **DatabaseImport/HomebrewDatabaseDetector.tsx** (2)
- [ ] **meeting-banner/page.tsx** (2)
- [ ] **notes/[id]/page.tsx** (1)

## Remaining — Onboarding (low priority, seen once)

- [ ] **onboarding/steps/DownloadProgressStep.tsx** (17)
- [ ] **onboarding/steps/WelcomeStep.tsx** (7)
- [ ] **onboarding/OnboardingContainer.tsx** (7)
- [ ] **onboarding/steps/SetupOverviewStep.tsx** (5)
- [ ] **onboarding/shared/ProgressIndicator.tsx** (4)
- [ ] **onboarding/shared/PermissionRow.tsx** (3)

## Remaining — UI Primitives

- [ ] **ui/button.tsx** (1)
- [ ] **molecules/form-components/form-input-item.tsx** (1)
- [ ] **molecules/form-components/form-select-item.tsx** (1)

---

**Total remaining:** ~100 occurrences across 28 files
