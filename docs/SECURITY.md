# Security model

- Single-owner access uses a server-only key and HMAC-signed HttpOnly, Secure, SameSite=Strict cookie.
- R2 is private; audio has no permanent public URL.
- Operation-specific signed URLs expire in ten minutes or less.
- Uploaded size, MIME type and stored metadata are checked before processing.
- Browser uploads bypass Vercel; credentials never reach the browser.
- Vercel/Modal messages use timestamped HMAC-SHA256 with five-minute replay windows.
- Active/daily limits and a global kill switch run before dispatch.
- Modal initially allows one processing container, a 30-minute timeout and 60-second idle scale-down.
- No customer audio is used for training.

Before multi-user access, replace the owner gate with database-backed identities and row-level authorization. Before public release, complete threat modeling, dependency scanning, malicious media fuzzing and credential rotation testing.
