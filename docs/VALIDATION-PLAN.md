# Validation protocol

This document defines acceptance work, not a claim that all checks have passed. Recorded execution results belong in the release test report.

## Processor checks

- Silence: nullable loudness, no invented tempo/key, finite output, no unexpected amplification.
- Sine wave: sample peak and RMS within tolerance, correct channel count and duration.
- Known stereo relationships: mono correlation near +1; polarity-reversed channels near -1; widening must not silently worsen an already unsafe result.
- Impulses/transients: bounded peaks, no dropped or repeated samples, onset alignment preserved.
- Low/high frequency tones: confirm intended EQ direction and no unstable coefficients at supported sample rates.
- Near-full-scale intersample signal: compare oversampled peak estimation with FFmpeg/independent measurement.
- Clipped input: detect clipped samples without claiming to reconstruct information that is unavailable.
- WAV encoders: inspect RIFF headers and decode actual bytes; verify 16/24-bit PCM and 32-bit float, rates, channels, duration, finite samples.
- Integer quantization: dither at final conversion only; do not claim increased information from a higher bit-depth container.
- Revisions: process from original and verify undo/redo restore actual settings/output identity.

## End-to-end acceptance

Upload a lawful MP3, decode, play original, analyze, render mix/master, compare at matched monitoring loudness, export 24-bit WAV, decode the WAV independently, inspect its metadata and peaks, and confirm a warranted process changes the audio. Repeat on mono and stereo sources, silence, corrupt media, and unsupported formats. Test cancellation and deletion before and during processing.

For local separation, run actual inference using the selected checkpoint, record checkpoint identity, produce four files, check alignment/duration/finite samples, sum stems and measure reconstruction error, then listen for bleed and artifacts. A unit test that mocks a separator is not evidence of working model inference.

## Music listening validation still required

Use original or authorized complete songs spanning Hip-Hop, Afrobeats, R&B and Dancehall first; include already-mastered tracks, dynamic acoustic music, difficult low-quality recordings, and long songs. Record source permission, sample rate, codec, duration, hardware, runtime, settings, before/after metrics and listener comments. Compare level-matched and blind where practical. Keep rejected results in the evaluation log.

Tests on synthetic signals establish numerical behavior, not professional music quality. Do not advertise professional-grade or genre-wide validation before that listening program is completed.

## Interface and privacy

Verify desktop and mobile upload, visible errors, busy/cancel state, actual waveform/seek, version switching, preservation of playback position, export download, keyboard navigation and readable controls. Verify browser mode has no audio-upload network request. Verify local-engine Host, Origin and credential rejection, malformed upload limits, path isolation, cancellation and cleanup. Report limitations in the release notes.
