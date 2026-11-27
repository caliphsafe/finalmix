# Local API v0.1

All requests are same-origin on http://127.0.0.1:8765. Hosted Vercel frontend does not connect to localhost. GET `/api/session` returns a per-launch `token`; supply header `X-Final-Mix-Token` on every remaining API request except health. No CORS. Host and Origin restrictions prevent ordinary DNS rebinding and cross-site calls. Do not publicly expose this service.

- GET `/api/health`: mode, version, separation_available, ffmpeg_available, limits.
- POST `/api/jobs`: multipart `audio` (required), `reference` (optional authorized file), `settings` JSON string. Returns `{id}`. 150 MiB per file, mono/stereo, 600 seconds maximum. 3 queued/running jobs and 12 total jobs maximum.
- GET `/api/jobs/{id}`: `{id,status,stage,progress,report?,error?}`. Progress reports completed stages, not a simulated timer. Status queued/running/complete/error/cancelled.
- DELETE `/api/jobs/{id}`: cancel processing and delete files. Active subprocess gets killed. Numeric DSP stages cancel between stages.
- GET `/api/jobs/{id}/audio?kind=master`: authenticated download. Kinds master, mix, original, vocals, drums, bass, other. Fetch as Blob with token; an `<audio src>` cannot supply the required header.

Settings (unknown fields rejected): `target_lufs` -24..-8 (default -14), `ceiling_db` -6..-.3 (default -1), `low_db`, `mid_db`, `high_db` -6..6, `width` 0..1.5, `compression` 0..1, `auto_correct` true, `strategy` stereo/stems/hybrid, `stem_gains` map vocals/drums/bass/other to -12..12 dB, `bit_depth` 16/24/32 (32 = float), `sample_rate` 0/44100/48000/96000 (0 = source), `format` wav/mp3, `reference_intensity` 0..1, `model_consent` false. Separation requires `model_consent:true` AND installed optional Demucs. Its first use downloads weights; recordings are not uploaded.

Report: before/mix/after measured dictionaries; export codec/rate/channel/bits/duration; decisions list; applied settings; separation reconstruction RMS ratio and fallback; quality clipping, true peak, duration checks. LUFS and true peak may be null for silence. No invented genre, key, sibilance, masking, vocal or subjective quality scores.

Temporary data is private per-launch, deleted on explicit DELETE or normal shutdown, and expires 6 hours after completion. A hard process kill can leave OS temporary files; manually remove `finalmix-*` folders from your OS temp folder if needed.
