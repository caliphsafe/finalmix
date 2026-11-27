# Changelog

## 2026-11-27 — V3 cloud migration foundation

- Recovered the unpublished V1 implementation and published `archive/v1-browser-local`.
- Verified V1 browser tests, Python tests, TypeScript and production build.
- Replaced the active runtime with cloud-only V3 orchestration.
- Added private owner access, R2 projects/assets/jobs, direct uploads, signed downloads and Modal HMAC dispatch/callbacks.
- Added a scale-to-zero stereo worker and manual deployment workflow.
- Deferred Supabase and Stripe by product decision.
- Kept processing disabled until integration testing.
