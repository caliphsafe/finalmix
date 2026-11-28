# Costs and controls

Checked November 27, 2026. Recheck before public usage.

Modal pricing: https://modal.com/pricing

Starter is listed at $0 base plus compute with $30 monthly credits. L4 is listed at $0.000222/second, T4 $0.000164 and A10 $0.000306. CPU/memory are billed per second. The first deployment uses CPU stereo processing, one container, a 30-minute timeout and scale-to-zero. GPU selection waits for benchmarks. Verify payment-method requirements during signup; the public page is not explicit.

Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/

Standard includes 10 GB-month, one million Class A and ten million Class B operations monthly with free egress. Current overages are $0.015/GB-month, $4.50/million Class A and $0.36/million Class B, with billing-unit rounding. Confirm payment-method requirements during activation.

Vercel pricing: https://vercel.com/pricing

The connected team is Pro. Current public pricing lists a $20 base and $20 included usage credit. Configure a hard spend limit; notifications alone do not stop charges. Large audio bypasses Vercel Functions.

Safeguards: 150 MB, 10 minutes, one active job, three daily jobs, two attempts, 30-minute worker timeout, one container, processing off by default, ten-minute URLs and lifecycle cleanup. Per-song cost remains unknown until a deployed worker processes real recordings.
