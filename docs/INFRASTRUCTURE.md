# Infrastructure

| Service | Purpose | Current state |
|---|---|---|
| GitHub | Source, CI, manual Modal deployment | Archive branch published; V3 branch pending push |
| Vercel Pro | Next.js UI and orchestration | Account confirmed; FINAL MIX project not linked |
| Cloudflare R2 | Private audio and manifests | Configuration required |
| Modal Starter | Scale-to-zero workers | Configuration required |
| Supabase | Multi-user relational phase | Deferred |
| Stripe | Commercial phase | Deferred; no live billing |

The app defaults `FINALMIX_GLOBAL_PROCESSING_ENABLED=false`. Enable it only after budgets and service connections are verified.
