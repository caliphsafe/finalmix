# Development status

## Audit baseline

- GitHub `main` initially contained only README.
- Recovered V1 had 48 unpublished files.
- Archive commit: `8e057488599417927dd408643fb9d5e47f78e374` on `archive/v1-browser-local`.
- V1 browser DSP: 11 controlled tests passed.
- V1 Python engine: 10 tests passed.
- V1 frontend typecheck and production build passed after correcting its package build policy and JSX defect.
- Demucs inference was never run and model weights were not commercially cleared.

## V3 feature matrix

| Capability | Status | Evidence or boundary |
|---|---|---|
| Cloud-only interface | Implemented / local build pending | Active page has no browser/local DSP calls |
| Private single-owner access | Implemented / deployment unverified | Signed HttpOnly cookie; Vercel secrets required |
| Direct private upload | Implemented / integration unverified | R2 PUT URL, content type and size signed and rechecked |
| Project persistence | Implemented / integration unverified | Private R2 JSON manifests |
| Async job state | Implemented / integration unverified | Real worker stages, monotonic callbacks, cancellation |
| Stereo Discovery/Mix/Master/Review | Implemented / cloud unverified | Reused measured DSP; Modal deployment required |
| Source separation | Blocked | Commercial model-weight rights and cloud benchmark required |
| Reference upload/matching | In development | Previous bounded algorithm preserved; V3 UI intentionally inactive |
| Conversational revision | Planned | Rule parser preserved in archive; cloud re-render path pending |
| Professional mixer | Planned | Must use cloud preview renders; no fake real-time controls |
| Albums/batch | Planned | Requires expanded persistence and benchmarks |
| Multi-user accounts | Deferred by product decision | Supabase removed from milestone 1 |
| Stripe | Deferred by product decision | No payment code or live billing |

Next: connect R2, connect Modal, process an authorized MP3, independently verify the output, then conduct a loudness-matched listening review.
