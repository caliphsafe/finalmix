# Infrastructure

| Service | Purpose | Current state |
|---|---|---|
| GitHub | Source, CI, Modal deployment | Archive and V3 branches published; PR #1 open |
| Vercel Pro | Next.js UI and orchestration | Production deployment ready at finalmix.vercel.app; private credentials configured |
| Cloudflare R2 | Private audio and manifests | Credentials configured; worker PutObject test rejected with AccessDenied |
| Modal Starter | Scale-to-zero workers | App deployed; remote probe executed; storage permissions block integration |
| Supabase | Multi-user relational phase | Deferred |
| Stripe | Commercial phase | Deferred; no live billing |

The app defaults `FINALMIX_GLOBAL_PROCESSING_ENABLED=false`. Enable it only after budgets and service connections are verified.

The account dashboard supplied by the owner shows $1 in credits and a $1 provider usage limit without a payment method. Do not assume the full advertised $30 allowance is active. No upgrade or payment-method change has been authorized.

The deployment workflow runs manually or when its own file or cloud/requirements.txt changes on develop/v3-cloud. It has a ten-minute timeout and serialized deployments. Its remote connectivity probe uses a unique diagnostics object, reads it back, deletes it, and checks a signed callback against a nonexistent job. A successful callback returns 404 after signature verification and a private manifest lookup; it does not create or process a song.

## November 27 deployment verification

- Vercel production redeployment verified READY; shared webhook secret present.
- GitHub credentials preflight passed. Modal deployment succeeded using SDK 1.6.4 (1.2.4 did not support the workspace's 2026.10 image builder).
- App: https://modal.com/apps/caliphsafe/main/deployed/final-mix-v3
- Workflow: https://github.com/caliphsafe/finalmix/actions/runs/46109229238
- Remote connectivity check failed at R2 PutObject with AccessDenied; cleanup DeleteObject was also denied. The Vercel signed callback was not reached. No song was processed.
- Worker endpoints saved in Vercel Production; require a later redeployment to take effect. Processing switch remains false.
- Web and Python CI passed for commit 87c37b932aff2ce1121805bc3b3cdfa3886f1e80.
- Next action: owner verifies Object Read & Write bucket scope and account/bucket identifiers for finalmix-r2. Do not widen to account administration permissions. Repeat the bounded connectivity test after correction.
