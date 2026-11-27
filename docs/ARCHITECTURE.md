# Architecture

FINAL MIX separates the interface, browser DSP, and local audio service. The initial release has no paid AI service, cloud audio store, accounts database, payment integration, or training pipeline.

## Browser path

The Next.js/React/TypeScript interface is statically exported. The browser decodes supported files using its audio implementation. PCM arrays feed standalone TypeScript analysis/processing functions in `src/audio`. A dedicated worker keeps long processing outside the UI thread; terminating the worker cancels its computation. The original audio remains independent from rendered versions.

The analysis contract contains real loudness, peak, RMS, crest, correlation, waveform, spectral-band and spectrum data; unavailable values are nullable. Processing returns separate mix and master buffers, before/after analysis, a decision log, validated settings, and quality-control warnings. WAV serialization is independent of playback. Browser format decoding and sample-rate behavior depend on the browser; unsupported files must report a decoding error rather than silently convert elsewhere.

## Local path

`engine` is an independent Python service using NumPy/SciPy and external FFmpeg/FFprobe. It validates media, measures the input, performs bounded stereo processing, renders exports, and remeasures them. Optional model integration operates locally. The same service serves the exported frontend so desktop users need not connect an HTTPS-hosted page to an HTTP loopback service.

The authoritative endpoint contract is [engine/API.md](../engine/API.md). The engine must bind only to loopback, reject unexpected Host/Origin values, require its local session credential, limit jobs and uploads, generate internal file names, and expose only known job outputs. Do not put the local token into the public Vercel deployment, open the port to a LAN, or add permissive CORS to work around browser restrictions.

## Processing boundaries

| Module | Responsibility | Does not establish |
|---|---|---|
| Decoder | Validate and turn media into PCM | Recovery of lost MP3 information |
| Analysis | Measured signal properties | Artistic intent or professional quality |
| Decision engine | Bounded, explainable choices | A universally ideal mix |
| Mixing | Tone, dynamics, source balance where available | Perfect stem recovery |
| Mastering | Final level, headroom and export preparation | Identical perceived quality across all listening systems |
| Quality control | Numerical integrity and warnings | Absence of all audible artifacts |
| Comparison | Playback and monitoring compensation | Changes to the downloaded master |

## State and extension points

Parameter snapshots and rendered versions support reversible revisions. Saved preferences are explicit settings, not learned models. Future cloud workers can implement the same job contract, but need authenticated storage, quotas, job isolation, user consent and spending approval before routing audio externally. Album sequencing, shared accounts, paid processing, profile marketplaces and DAW plugins are future products, not hidden dependencies of this release.
