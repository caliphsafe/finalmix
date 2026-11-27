# Application API

User endpoints require the signed owner cookie except health and login.

- `POST /api/auth/login` and `/api/auth/logout` — manage private studio access.
- `GET|POST /api/projects` — persistent project manifests.
- `POST /api/uploads/sign` — authorize one direct R2 PUT.
- `POST /api/uploads/complete` — verify uploaded bytes/content type.
- `GET|POST /api/jobs` — list or idempotently dispatch jobs with quota enforcement.
- `GET|DELETE /api/jobs/:id` — actual state or cancellation request.
- `GET /api/jobs/:id/audio` — short-lived private playback/download URL.
- `POST /api/worker/progress` — signed Modal callback; progress cannot move backward.
- `GET /api/health` — configuration booleans, never secret values.

Modal receives object keys and bounded settings. It uses its own R2 secret rather than receiving credentials from Vercel.
