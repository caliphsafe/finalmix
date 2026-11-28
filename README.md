# FINAL MIX V3

Autonomous Audio Engineering Studio — a proprietary 43DOU product.

FINAL MIX V3 is a cloud-only Next.js application with direct private audio uploads to Cloudflare R2 and asynchronous audio processing on Modal. The active product never processes audio in the browser and never requires a local engine.

## Current milestone

The repository contains a deployable, private single-owner cloud workspace, authenticated direct uploads, persistent R2 project/job manifests, signed Modal dispatch, real worker progress, cancellation, private playback/download URLs, and a measured stereo mixing/mastering worker. Processing remains administratively disabled until R2 and Modal are connected and verified.

The previous verified browser/local foundation is preserved on `archive/v1-browser-local`; it is not part of the V3 runtime.

## Development

```bash
pnpm install --frozen-lockfile
pnpm ci
pnpm dev
```

Local web development does not process audio. Copy `.env.example` to `.env.local` only for development and never commit secrets.

See [SETUP](docs/SETUP.md), [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), and [testing](docs/TESTING.md).
