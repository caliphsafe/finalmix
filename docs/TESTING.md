# Testing

## Verified before migration

- Browser DSP: 11 tests passed, including MP3-to-24-bit-WAV and independent FFmpeg measurements.
- Python DSP/API: 10 tests passed, including formats, rates, cancellation, anti-phase handling and verified output.
- Frontend: TypeScript and production build passed.

These tests establish behavior, not professional sound quality.

## V3 required verification

1. Typecheck, cloud API tests and production build.
2. R2 direct upload, CORS, object verification and signed download.
3. HMAC rejection/replay tests in both worker directions.
4. Modal execution on an authorized MP3.
5. ffprobe verification of WAV codec, depth, sample rate, channels and duration.
6. Independent loudness and true-peak measurement.
7. Loudness-matched owner listening review.
8. Failure, cancellation, timeout and cleanup tests.
9. Measured compute time, memory, storage and provider usage.
