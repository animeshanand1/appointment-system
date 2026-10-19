# Security notes

This repository is the browser app only. Anything the browser does can be
bypassed by calling the API directly, so the server is where security is
actually enforced. This file lists what the client does and what the backend
(not in this repo) must do.

## What the client does

- **No secrets in the bundle.** The demo login and signup fills exist only in
  `npm run dev`. Production builds drop them, so the login form starts empty.
  No physician invite code is shipped at all.
- **Input validation and cleanup** (`src/lib/sanitize.js`). Forms check email
  format, name characters, phone digits, password strength (8–128 characters,
  a letter and a number, not the email) and length limits. Every JSON request
  body is cleaned before it is sent: control, zero-width and bidi-override
  characters are removed, Unicode is normalized and whitespace is trimmed.
  Passwords and invite codes are sent exactly as typed.
- **Safe output.** React escapes everything it renders, and the code never uses
  `dangerouslySetInnerHTML`. Phone numbers from the API only become `tel:`
  links when they are plain digits. Navigation state can't redirect to another
  site. Unknown `?department=` values are ignored.
- **Request hygiene** (`src/lib/api.js`). Requests are same-origin only and
  carry `X-Requested-With`. Responses are fetched with `cache: no-store`.
  Requests time out after 15 s. Responses that aren't JSON, or are larger than
  2 MB, are rejected. Ids are encoded, and `.`/`..` ids are refused.
- **Backoff.** After a `429` the client stops calling that endpoint until
  `Retry-After` has passed. It also allows at most 5 login and 3 signup attempts
  per minute. This reduces accidental hammering but doesn't stop an attacker.
- **Headers.** Production builds include a Content-Security-Policy `<meta>`
  (scripts only from our own origin, no inline scripts or eval). `vite preview`
  and the dev server also send `nosniff`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` and `COOP`.

## What the backend must do

1. **Validate everything again** with a schema (zod/Joi/express-validator) and
   the same limits as `LIMITS` in `src/lib/sanitize.js`. Reject unknown fields,
   and never trust `role`: only issue `doctor` accounts when the invite code is
   valid. Keep invite codes single-use and expiring, and rotate any code that
   was ever committed to git (for example `DOC-CARE-2026`).
2. **Rate limiting / DDoS.** Use per-IP and per-account limits on
   `/api/auth/*` (e.g. 5 logins/minute, with lockout and backoff), and a
   general limit on the rest of `/api`. Always send `Retry-After`. Cap request
   bodies (`express.json({ limit: '10kb' })`), set server timeouts, and put a
   CDN or WAF (Cloudflare, AWS Shield, etc.) in front for volumetric attacks.
3. **Sessions.** The cookie should be `HttpOnly; Secure; SameSite=Lax` (or
   `Strict`). Rotate the session id at login and destroy it at logout. Check
   `Origin` and require `X-Requested-With` (or a CSRF token) on every request
   that changes state.
4. **Passwords.** Hash with argon2id or bcrypt (cost ≥ 12). Use the same
   generic error for "no such user" and "wrong password".
5. **Headers.** Use `helmet()` or equivalent to send the same headers as
   `SECURITY_HEADERS` in `vite.config.js`, plus
   `Content-Security-Policy` with `frame-ancestors 'none'` and HSTS
   (`Strict-Transport-Security: max-age=31536000; includeSubDomains`).
6. **File uploads (if added).** The app has no upload feature today. If one
   is added: set a size cap, allow-list file types by checking magic bytes (not
   the extension or `Content-Type`), give stored files random names, store them
   outside the web root or in object storage, scan them with an antivirus such
   as ClamAV, serve them with `Content-Disposition: attachment` and `nosniff`,
   and never execute or render uploaded HTML or SVG inline.
7. **Data access.** Check on every route that the record belongs to the
   requester (a patient sees only their appointments, a doctor only their
   own). Use parameterized queries or an ODM with `sanitizeFilter`/strict
   query mode to block NoSQL operator injection (`{ "$gt": "" }`).
8. **Logging.** Don't log passwords, session cookies or clinical notes. Return
   generic 5xx messages to the client.

Run `npm audit` regularly. It currently reports 0 vulnerabilities.
