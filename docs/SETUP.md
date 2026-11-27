# Setup checklist

- GitHub: **connected; archive tested; V3 branch pending publication**
- Vercel: **account confirmed; project configuration required**
- Cloudflare R2: **not started**
- Modal: **not started**
- Supabase: **deferred**
- Stripe: **deferred**

## Vercel environment variables

Add values in Project Settings → Environment Variables. Never send values through chat.

- `FINALMIX_ACCESS_KEY`: long private passphrase used to open the studio.
- `FINALMIX_SESSION_SECRET`: separate random value of at least 32 characters.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
- `MODAL_JOB_ENDPOINT`, `MODAL_CANCEL_ENDPOINT`, `MODAL_WEBHOOK_SECRET`.
- `NEXT_PUBLIC_SITE_URL` and limit variables from `.env.example`.

Keep `FINALMIX_GLOBAL_PROCESSING_ENABLED=false` until end-to-end verification.

The first external connection is R2. Use bucket `finalmix-audio` and token `finalmix-vercel-signer`. CORS should allow only exact Vercel origins and required `PUT`, `GET`, `HEAD` methods. Lifecycle rules expire temporary prefixes after one day and intermediate assets after seven days.

The second connection is Modal. Use workspace `final-mix`, secrets `finalmix-r2` and `finalmix-worker`, and GitHub Actions secrets `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET`. Deployment stays manual until the first job passes.
