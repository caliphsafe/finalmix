# FINAL MIX local engine

This independent Python engine genuinely decodes, measures, processes and exports audio. It is a conservative stereo processing foundation, **not a complete autonomous professional engineer**. Optional HTDemucs integration is experimental and requires separately installed dependencies and explicit consent. No recordings are sent to model services.

## Installation and launch

Install Python 3.11 (recommended), Node.js 22+, pnpm, and FFmpeg including ffprobe. FFmpeg must be on PATH. Get FFmpeg from https://ffmpeg.org/download.html. Use a current maintained build appropriate to your OS; its licensing depends on the selected build. The application invokes an executable and does not redistribute FFmpeg.

### macOS

1. Open Terminal in the downloaded/cloned FINAL MIX folder.
2. If using Homebrew, `brew install ffmpeg python@3.11 node` supplies prerequisites. Install pnpm as documented at https://pnpm.io/installation.
3. Run `sh scripts/setup-macos.sh` (uses `python3`; ensure it is Python 3.11/3.12).
4. Run `pnpm install` then `pnpm build`.
5. Run `sh scripts/start-macos.sh`.
6. Open http://127.0.0.1:8765. Keep Terminal open. Ctrl+C stops the engine and deletes temporary jobs.

### Windows

1. Install Python 3.11 from python.org, Node.js 22+, pnpm, and FFmpeg. Add FFmpeg's `bin` directory to PATH; open a new terminal and verify `ffmpeg -version` and `ffprobe -version`.
2. Open Command Prompt in the FINAL MIX folder. Run `scripts\setup-windows.bat`.
3. Run `pnpm install`, then `pnpm build`.
4. Run `scripts\start-windows.bat` and open http://127.0.0.1:8765.

### Optional source separation

Use `.venv/bin/python scripts/install-model.py` on macOS/Linux or `.venv\Scripts\python scripts\install-model.py` on Windows. The script requires explicit INSTALL confirmation. Restart engine after installation. First separation downloads weights. Use `model_consent:true` and `strategy:stems` or `hybrid` in the API.

The pinned PyTorch/Demucs pair targets Python 3.11. CPU only is used initially for predictable operation; plan on 8–16 GB RAM and minutes to tens of minutes for a song, **estimates, not measured hardware guarantees**. Model inference was not validated in this development runtime because PyTorch, Demucs and weights were unavailable. Failures are explicit, never replaced by fake stems. Demucs code is MIT; pretrained weights require an independent rights review before commercial use. See https://github.com/adefossez/demucs and https://github.com/facebookresearch/demucs.

## Implemented processing

- FFmpeg decoding of supported MP3/WAV/FLAC/AIFF/M4A/OGG files; mono/stereo validation. 150 MiB per input, 600 seconds and 60 million decoded samples maximum.
- BS.1770-family integrated loudness, LRA and true peak through FFmpeg loudnorm; full-track RMS, peak, crest, spectral bands/centroid, correlation, side/mid ratio, silence and quiet-window energy.
- Three-band bounded corrective EQ; optional linked RMS compression; mid-side width with negative-correlation widening guard; mix gain staging.
- Linear loudness gain capped by 4× oversampled peak headroom. This preserves dynamics and may intentionally fall below requested LUFS. It is **not** a lookahead brickwall limiter.
- Reference broad-band energy and integrated loudness matching, bounded to prevent aggressive curve imitation. No YouTube extraction.
- Optional genuine HTDemucs four estimated stems. Reconstruction error over 25% RMS triggers stereo fallback. This check **cannot identify all audible artifacts**. Stem gains are explicit user controls; automatic instrument balance judgment is not implemented.
- Separate mix/master output, 16/24-bit PCM or 32-bit float WAV; source/44.1/48/96 kHz; 320 kbps MP3 if FFmpeg includes libmp3lame. Integer exports request triangular dither. Converting lossy MP3 to WAV does not restore lost information.
- Decode and remeasure exported result; attenuate/re-export for true peak violations; withhold exports failing clipping/duration/peak checks.

## Security and privacy

Only loopback binding on port 8765 is supported. Exact Host and Origin checks, per-launch random session token, no cross-origin access, no audio filenames used as disk paths, constrained settings, one worker, bounded queue, private temp directory, explicit deletion and six-hour completed-job TTL. Temporary data is removed on normal shutdown. A hard kill can leave `finalmix-*` folders in the OS temp directory; remove them manually. No telemetry, paid API, cloud audio transfer or training.

The hosted web UI must not connect directly to this HTTP engine. Use the locally served copy. Installing model packages/weights requires network access, but does not upload songs.

## API, testing and troubleshooting

See [API.md](API.md). Run `python -m unittest discover -s tests/python -v` from the root after installing test dependency `httpx` if absent. Tests include original synthetic music, calibrated signals, silence, mono, anti-phase, export formats/rates and API protections. This is not a listening evaluation on commercial recordings.

- Missing ffmpeg: fix PATH; restart terminal.
- Missing frontend: run `pnpm build` before starting engine.
- Missing Demucs: use optional installer or stay in Stereo.
- Model loading/weight errors: inspect the returned job error, check network/cache and Python/torch versions. Do not download untrusted checkpoints.
- 401: refresh local page to obtain a fresh session token.
- 403: use exactly http://127.0.0.1:8765 or http://localhost:8765.
- 429: delete completed jobs before submitting more.
- Memory limit: shorten recording, reduce source sample rate, or use browser mode for a suitable shorter file.

## Known missing capabilities

No restoration/declip/denoise, per-vocal de-esser, instrument masking detector, BPM/key/genre classifier, section-aware automation, reverb/delay, dynamic EQ, multiband compression, saturation, transient shaper, trained preference learning, artifact classifier or professional listening validation. These are not represented as implemented features.
