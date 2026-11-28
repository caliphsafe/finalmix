# Infrastructure

| Service | Purpose | Current state |
|---|---|---|
| GitHub | Source, CI, Modal deployment | Archive and V3 branches published; PR #1 open |
| Vercel Pro | Next.js UI and orchestration | Production deployment ready at finalmix.vercel.app; private credentials configured |
| Cloudflare R2 | Private audio and manifests | Credentials configured; cloud read/write verification pending |
| Modal Starter | Scale-to-zero workers | User reports named secrets configured; deployment verification in progress |
| Supabase | Multi-user relational phase | Deferred |
| Stripe | Commercial phase | Deferred; no live billing |

The app defaults `FINALMIX_GLOBAL_PROCESSING_ENABLED=false`. Enable it only after budgets and service connections are verified.

The account dashboard supplied by the owner shows $1 in credits and a $1 provider usage limit without a payment method. Do not assume the full advertised $30 allowance is active. No upgrade or payment-method change has been authorized.

The deployment workflow runs manually or when its own file changes on develop/v3-cloud. It has a ten-minute timeout and serialized deployments. Its remote connectivity probe uses a unique diagnostics object, reads it back, deletes it, and checks a signed callback against a nonexistent job. A successful callback returns 404 after signature verification and a private manifest lookup; it does not create or process a song.
