# Browser engineering engine

Pure TypeScript DSP. Runs in a dedicated worker; terminate the worker for immediate cancellation. No network calls and no paid inference. Typed public API: `index.ts`, `types.ts`. Input buffers are never modified.

## What is implemented

- Mono/stereo sample statistics across the complete recording, gated integrated loudness, momentary and short-term loudness, approximate LRA, stereo correlation and mid/side energy width.
- K-weighting via De Man bilinear coefficients; 400 ms blocks at 100 ms steps, -70 LUFS absolute gate, -10 LU relative gate. Incomplete trailing blocks do not contribute to gated loudness.
- Spectral energy and power-weighted centroid using Hann-windowed 2048-point FFTs at 100 ms intervals. Spectral analysis is sampled, not every-sample STFT. Band values are energy fractions, not perceptual diagnoses.
- 4× reconstructed peak estimate using 16-tap Hann-windowed sinc phases. Quiet-window skipping uses an upper bound larger than the filters' maximum absolute coefficient sum. Not certified against the complete ITU meter conformance suite.
- Broad bass, low-mid, presence and air EQ; optional stereo-linked compression; mid/side width with mono sum preserved before master limiting; measured gain intention; 5 ms look-ahead peak limiting with 100 ms release; post-limiter reconstructed-peak trim.
- Automatic correction only for extreme low-mid/presence energy ratios. These are conservative heuristics that can be disabled, not proof of excessive mud or harshness.
- Automatic mastering preserves more dynamics when crest factor is high. User genre and style preferences change bounded engineering priorities. There is no automatic genre classifier.
- Authorized reference audio matches four broad energy ratios, capped at ±2 dB times intensity, and blends loudness intention. No reference samples enter the output.
- Separate corrected mix and master, before/after report, decision rationale and QC warnings.
- Little-endian PCM16/PCM24 WAV with triangular PDF dither, or float32 WAV without dither. Export uses the AudioData sample rate; UI sample-rate conversion must happen before export.

## Intentional limits

No vocal separation, source restoration, BPM/key estimation, section recognition, de-essing, dynamic EQ, multiband compression, saturation, reverb or delay in browser mode. Unsupported conversational requests are rejected. The Analog style is warm tone shaping, not emulated analog electronics. The Punchy style preserves dynamics; it does not claim to isolate or enhance drum transients. Silence percentage is the fraction of frames whose peak is below -90 dBFS, not a semantic silent-region detector.

Peak safety and dynamics can prevent the requested loudness from being reached. QC checks technical signal properties, not subjective professional quality. True-peak safety must be checked again after sample-rate conversion and lossy encoding. Browser performance depends on memory and hardware; permitted input is 0.4 seconds–10 minutes, mono/stereo, 8–192 kHz. The UI applies tighter upload limits.

## References

- ITU-R BS.1770-5, audio programme loudness and true peak: https://www.itu.int/rec/R-REC-BS.1770/en
- FFmpeg `loudnorm` / `ebur128` independently measure test signals: https://ffmpeg.org/ffmpeg-filters.html
- EBU Tech 3342 for LRA definition: https://tech.ebu.ch/publications/tech3342

## Reproducible validation

`node --import tsx --test tests/audio/*.test.ts`

The test suite checks known 1 kHz loudness, stereo +3.01 LU energy, anti-phase detection, silent input, EQ response, immutable source, exact limiter alignment, estimated ceiling, PCM header/size, command bounds, and independently checks FFT-free loudness/peak metrics with FFmpeg at 44.1, 48 and 96 kHz. The complete ITU compliance suite and professional listening tests remain outstanding. Generated signals are original test material, not commercial recordings.
