# Endpoint Specs

## `GET /healthz`

Purpose: quick liveness and build verification.

Response:

```json
{
  "ok": true,
  "service": {
    "id": "<game-id>",
    "environment": "staging"
  },
  "build": {
    "buildId": "<build-id>",
    "commitSha": "<full-sha>",
    "shortCommitSha": "<short-sha>",
    "version": "<display-version>",
    "committedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
  },
  "maintenance": {
    "enabled": false
  },
  "checks": {
    "runtime": "ok"
  }
}
```

Rules:

- No secrets, redirect URI lists, tokens, cookies, private keys, or webhook URLs.
- Add subsystem checks only when they are cheap and non-mutating.
- Prefer `Cache-Control: no-store`.

## `GET /metrics`

Purpose: Prometheus scrape surface for deploy verification, incident triage, and scale checks.

Minimum metric families:

- `<prefix>_build_info`
- `<prefix>_maintenance_mode`
- `<prefix>_process_uptime_seconds`
- `<prefix>_process_resident_memory_bytes`
- `<prefix>_process_heap_used_bytes`

Add subsystem metrics where applicable:

- request counts and durations
- persistence operations
- game operation durations
- state size or backlog pressure
- queue depth
- account auth failures
- co-op/session ticket lifecycle counts

Rules:

- Use text/plain Prometheus format.
- Do not emit raw user identifiers, email, wallet addresses, session tokens, or authorization data as labels.
- Keep metric names stable after production launch.

## `GET /api/release`

Purpose: release catalog for clients and deploy verification.

Required fields:

- service id
- environment
- current build id
- full and short SHA
- display version
- deployed or committed time
- update mode
- patch-note source
- current player-facing patch-note entry when known
- public docs source or URL when docs are in scope
- Discord announcement status when announcements are in scope
- maintenance state

Allowed update modes:

- `prompt`
- `force`
- `silent`
- `service-worker-offline-cache`

## Maintenance Responses

Player pages and mutating routes should return:

```json
{
  "error": "maintenance",
  "maintenance": true,
  "message": "Game on maintenance",
  "discordUrl": "https://discord.gg/<stable-invite-code>"
}
```

Use HTTP 503 and include `Retry-After` when there is a known window.

## Account Auth Surface

Recommended game routes:

- `GET /api/auth/session`
- `GET /api/auth/login`
- `GET /api/auth/register`
- `GET /api/auth/callback`
- `POST /api/auth/logout`

Offline games can keep solo play available when HL Accounts is unavailable. Account-gated features should fail closed.
