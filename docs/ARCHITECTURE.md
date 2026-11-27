# FINAL MIX V3 architecture

The browser handles interface state, direct signed uploads, playback, polling and downloads. Vercel authenticates the private owner, signs storage operations, enforces limits and dispatches jobs. R2 stores private assets and JSON manifests. Modal downloads private objects, runs processing, uploads verified results and signs progress callbacks.

```text
Browser -> Vercel: authenticate and request signed operation
Browser -> R2: upload recording directly
Vercel -> Modal: HMAC-signed job dispatch containing object keys, never credentials
Modal -> R2: read source and write private mix, master and report
Modal -> Vercel: HMAC-signed stage completion
Browser -> Vercel -> R2: short-lived playback or download URL
```

Large audio never traverses a Vercel Function. R2 credentials and Modal secrets stay server-side. Presigned URLs expire in ten minutes or less.

The personal-use milestone uses owner-scoped JSON manifests in R2. This removes the database/account dependency without making jobs ephemeral. Supabase is deferred until multi-user accounts, relational albums, credits and administrative reporting require PostgreSQL and RLS.

Discovery, Separation, Mix, Reference, Master, Review and The Engineer remain the target. Milestone 1 deploys measured Discovery, conservative stereo Mix, Master and Review. Unsupported engines are not simulated. The measured Python DSP is reused by the cloud image. Browser DSP remains archived as test evidence and is excluded from the V3 execution path.
