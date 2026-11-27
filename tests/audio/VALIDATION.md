# Browser DSP validation — 26 November 2026

Run: `node --import tsx --test tests/audio/*.test.ts`

Tests use original generated signals and an original synthesized 12-second bass/percussion/melody arrangement. No commercial recordings were used. MP3 encode/decode and independently measured loudness / peak checks use the installed FFmpeg and ffprobe.

Verified:

- Known 1 kHz sine RMS, crest factor and K-weighted loudness.
- Mono versus two identical channels changes integrated loudness by 3.01 LU.
- Anti-phase stereo produces negative correlation and full side energy.
- Silence does not yield invented loudness or a rendered master.
- Bass EQ changes bass energy without modifying input.
- Look-ahead limiting catches an impulse without shifting sample timing.
- PCM16, PCM24 and Float32 WAV headers, lengths and formats.
- Unsupported isolated-vocal requests rejected; processing ranges validated.
- FFmpeg loudness and estimated-peak agreement within 0.15 dB for 997 Hz stereo tone at 44.1, 48 and 96 kHz.
- ffprobe confirms 24-bit stereo WAV, correct sample rate and duration.
- MP3 decoded audio is actually processed; original and output differ; duration is preserved.
- Independent exported musical-fixture true peak does not exceed -0.95 dBTP with a -1 dBTP intention; FFmpeg output loudness agrees within 0.2 LU.
- Reconstructed peak detects high-frequency intersample overs.

Observed on the managed Linux development environment (Node 24.22.3): the first 10 tests completed in 4.55 seconds; the 12-second MP3 musical roundtrip test took 1.65 seconds, including file conversion, DSP and independent FFmpeg measurement. These are container measurements, not a promised browser/hardware throughput. CPU topology was unavailable to `lscpu`.

Not yet validated: full ITU conformance corpus, real-world full-length genre recordings, trained listener judgments, extended browser/device matrix, adversarial lossy files and multitrack listening comparisons. Those are required before professional-grade performance claims.
