# Security Guardrails — March 2026

Security hardening applied to SilentEye backend based on the architecture audit conducted on 2026-03-21.

## Vulnerabilities Addressed

### V8 — Circuit Breaker (SOLVED)

**Before:** External services (Twilio SMS, SMTP email, Web Push) had no failure isolation. If Twilio went down, every OTP request would hang waiting for a timeout, wasting resources and degrading UX.

**After:** Created `backend/src/utils/circuit-breaker.ts` with a 3-state pattern (CLOSED / OPEN / HALF_OPEN). Applied to:

- `sms-service.ts` — Twilio SMS (3 failures → 60s cooldown)
- `email-service.ts` — SMTP email (3 failures → 60s cooldown)
- `push-service.ts` — Web Push VAPID (3 failures → 60s cooldown)

When the circuit opens, calls return gracefully (false/0) instead of blocking. After the cooldown, a single test call determines if the service has recovered.

### V1 — JWT Expiry Reduced (SOLVED)

**Before:** JWT tokens expired after 720 hours (30 days). A leaked token provided month-long access.

**After:** Default reduced to 24 hours in `auth.ts`. Configurable via `JWT_EXPIRES_IN` env var.

### V2 — IMEI Whitelist Enforced in Production (SOLVED)

**Before:** `TELTONIKA_SKIP_WHITELIST` defaulted to `true`, allowing any GPS device to connect and inject data — even in production.

**After:** In `tcp-server.ts`, production (`NODE_ENV=production`) now **always enforces** the IMEI whitelist regardless of env vars. Only devices registered in the `vehicles` table can connect. Development retains the opt-out for testing convenience. Additionally, DB errors during whitelist verification now **reject** connections in production instead of silently accepting them.

### V13 — Incident State Machine Validation (SOLVED)

**Before:** `PUT /incidents/:id/status` accepted any valid status value without checking whether the transition was logically valid. A resolved incident could be set back to "active".

**After:** Added `VALID_TRANSITIONS` map in `routes.ts`:

```
active       → attending, cancelled, falsa_alarma, resolved
attending    → localizado, cancelled, falsa_alarma, resolved
localizado   → recuperado, resolved, falsa_alarma
recuperado   → resolved
resolved     → (none — terminal)
falsa_alarma → (none — terminal)
cancelled    → (none — terminal)
```

Invalid transitions return HTTP 400 with the list of allowed next states.

### V14 — SerpAPI Timeout + GPS Logs Retention (SOLVED)

**Before:**
- The `POST /prospects/search-maps` endpoint called SerpAPI without a timeout. A slow or unresponsive upstream could block the request handler indefinitely.
- `gps_logs` table grew unbounded with no retention policy.

**After:**
- Added `AbortController` with 10-second timeout to SerpAPI fetch. Returns HTTP 504 on timeout.
- Added `startGpsLogsCleanup()` cron job in `index.ts`: deletes GPS logs older than 90 days (configurable via `GPS_LOG_RETENTION_DAYS`). Runs every 24 hours with a 5-minute startup delay.

## New Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GPS_LOG_RETENTION_DAYS` | `90` | Days to retain GPS log entries before automatic cleanup |

## Files Changed

| File | Change |
|------|--------|
| `backend/src/utils/circuit-breaker.ts` | **NEW** — Circuit Breaker utility class |
| `backend/src/services/sms-service.ts` | Wrapped Twilio call with CircuitBreaker |
| `backend/src/services/email-service.ts` | Wrapped SMTP sendMail with CircuitBreaker |
| `backend/src/services/push-service.ts` | Wrapped web-push with CircuitBreaker |
| `backend/src/api/auth.ts` | JWT default expiry 720h → 24h |
| `backend/src/gps/tcp-server.ts` | IMEI whitelist forced in production; DB errors reject in prod |
| `backend/src/api/routes.ts` | State transition validation + SerpAPI AbortController timeout |
| `backend/src/index.ts` | GPS logs cleanup cron job |

## Breaking Changes

**TCP Server (IMEI Whitelist):** Devices not registered in the `vehicles` table will be **rejected** in production. Ensure all active GPS devices have their IMEI registered before deploying. This does not affect development environments.

**JWT Expiry:** Existing tokens issued with the previous 30-day default will continue to work until they expire. New tokens will expire after 24 hours. Users will need to re-authenticate more frequently.
