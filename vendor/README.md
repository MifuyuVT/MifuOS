# vendor/

Self-hosted, exact-pinned copies of third-party scripts. They used to be loaded
from `cdn.jsdelivr.net`, but allowlisting a whole CDN origin in `script-src`
means *any* file ever published under that origin is implicitly trusted —
flagged by CSP scanners as a "JSONP endpoint" / arbitrary-code risk. Serving
them from `'self'` instead removes the CDN from `script-src` entirely.

| File | Package | Pinned version |
|---|---|---|
| `twemoji.min.js` | `@twemoji/api` | 17.0.3 |
| `supabase.min.js` | `@supabase/supabase-js` (UMD build) | 2.108.2 |

## Updating

```sh
curl -o vendor/twemoji.min.js  https://cdn.jsdelivr.net/npm/@twemoji/api@<version>/dist/twemoji.min.js
curl -o vendor/supabase.min.js https://cdn.jsdelivr.net/npm/@supabase/supabase-js@<version>/dist/umd/supabase.js
```

Bump the version in this README too. There's no auto-update (no `@latest`/`@2`
floating tag anymore) — that's intentional, so a compromised or unexpectedly
changed upstream release can't silently ship to this app.
