---
status: pending
epic: waveform-visualization
depends_on: none
---

# Epic 7: Real Audio Waveform Visualization

## What

The recording controls waveform bars are decorative — wire them to real audio level data so they correlate with actual mic/system input.

## Context

George sends waveform data down from the webbridge. Could potentially use the same data source, or tap into the existing audio pipeline metrics (RMS levels from `pipeline.rs`).

## Options

1. Use existing `AudioPipelineManager` RMS metrics — already computed for mixing/ducking
2. Tap webbridge waveform data if George exposes it
3. Emit Tauri events with audio levels at ~30-60fps, consume in React

## UI Target

The 3 vertical bars next to the stop button in the recording controls should animate based on real audio amplitude.
