# Runtime Surface Map

This map separates studio contracts from current game implementation details.

| Surface | Studio contract | Utevo Lux example | Mana Panic example |
| --- | --- | --- | --- |
| `GET /healthz` | JSON with `ok`, service id, environment, build metadata, and no secrets. | Fastify route in `server/app.ts`; release headers on responses. | Fastify route in `server/index.mjs` with `build` metadata and `x-mana-panic-*` headers. |
| `GET /metrics` | Prometheus text. Include build info, maintenance state, process metrics, request metrics, and subsystem metrics where applicable. | Request, DB, game operation, state pressure, process, event-loop, SQLite metrics. | Build info, maintenance mode, process uptime, and process memory metrics. |
| `GET /api/release` | JSON release catalog with build id/SHA/version/deployed time/update mode/patch-note source/release-note metadata/maintenance state. | Release catalog store from build env and patch-note metadata. | Release catalog from build metadata and `public/data/patch-notes.json`. |
| Maintenance response | 503 for player pages and mutating routes; operator surfaces stay reachable. | Shared maintenance helper with Discord URL validation. | Branded maintenance page plus JSON for API routes. |
| Account auth | Shared HL Accounts OAuth for online identity; games keep local sessions and saves. | Utevo Lux supports account state and premium integration. | Mana Panic consumes HL Accounts for login-gated co-op. |
| Product analytics | Versioned first-party structured event envelope with privacy guard. | Server-side implementation in product analytics module. | Target state for future implementation. |
| Offline cache | Game-specific but must advertise release/update mode and safe persistence ownership. | Online authoritative runtime with client update checks. | Service-worker offline cache and local solo progress. |
| Session tickets | Optional; must be scoped, expiring, signed or server-issued, and not a save owner. | Not the primary current surface. | Co-op hosting/joining/browse ticket routes. |
| P2P co-op | Optional; server owns tickets and public-room discovery while host-authoritative peers follow message, snapshot, backpressure, recovery, and diagnostics rules from `Inner Core/P2P_COOP_CONTRACT.md`. | Not the primary current surface. | Browser P2P co-op with public/private parties, ticket verification, room heartbeats, host snapshots, movement correction, and host migration. |
| Visual timeline | Optional for static games; animated or polling clients should merge authoritative visual events by id and server time. | Target contract after HLever rollout stutter fixes. | Target contract for future animated multiplayer surfaces. |

## Metric Prefix Rule

Metric prefixes are game-local. Utevo Lux uses `twb_`; Mana Panic uses `mana_panic_`. HLever examples use `hl_game_` only as a placeholder. New games should pick a stable prefix before first production deploy and avoid renaming it without a dashboard migration.

## Required Release Proof

Deploy verification must prove all three things:

1. The process is alive.
2. The process exposes the expected build metadata.
3. The public player path and public docs path are not being confused with each other.
