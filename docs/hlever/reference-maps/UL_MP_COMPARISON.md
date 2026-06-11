# UL and MP Operational Comparison

This map summarizes what HLever borrows from Utevo Lux and Mana Panic without making either game the template wholesale.

## Source Repos

| Area | Utevo Lux reference | Mana Panic reference | HLever decision |
| --- | --- | --- | --- |
| Repository workflow | Fresh `codex/` branches for tracked work after syncing `staging`; PRs target `staging`; production promotion is explicit `staging` to `main`. | Fresh branches, PRs to `staging`, explicit production promotion, issue comments for handoffs. | Standardize one active branch and one PR per request, `staging` as validation lane, `main` as production lane. |
| Deploy terminology | Ambiguous `deploy` means staging; production requires explicit wording. | Same staging-first language, with production guarded separately. | Copy staging-first terminology into all game templates. |
| Runtime probes | `/healthz`, `/metrics`, `/api/release` on game and account services. | `/healthz`, `/metrics`, `/api/release` on local preview, staging, and production. | Make these the studio runtime surfaces for any online or hybrid game. |
| Maintenance | Operator surfaces remain reachable; player/write routes can return 503. | Maintenance keeps `/healthz`, `/metrics`, and `/api/release` available and blocks gameplay/mutating API routes. | Require maintenance to preserve verification surfaces. |
| Public docs | Static public docs are separate from the game runtime and must not be confused with runtime health. | Static public docs have separate deploy variables and DNS verification. | Keep public docs/DNS incidents separate from game runtime incidents. |
| Accounts | Shared HL Accounts owns identity, OAuth, Lux, premium, and provider links; game owns save/progression. | Mana Panic consumes HL Accounts and keeps solo/co-op state game-local. | Define a studio account boundary and a game-local persistence boundary. |
| P2P co-op | Not the primary current surface. | Browser P2P co-op uses server-issued tickets, public-room heartbeat/browse/close, host-authoritative snapshots, corrections, backpressure, and host migration. | Add an optional provider-neutral P2P co-op contract without making PeerJS or browser WebRTC mandatory. |
| Analytics | Product analytics baseline uses first-party structured logs and a versioned event envelope. | Mana Panic still has browser analytics and should move toward the same server-side envelope. | Require the event envelope while leaving the sink first-party by default. |
| Assets and Skin | Large resources are local-only and not copied into infrastructure docs. | Large Tibia references are local-only and not copied into runtime unless extracted. | HLever defines optional local Skin resource conventions, but must not contain game assets or source-resource mirrors. |

## Non-Goals For HLever

- HLever does not choose a game engine.
- HLever does not mandate Fastify, Vite, React, SQLite, or TypeScript.
- HLever does not replace a game repo's local `AGENTS.md`.
- HLever does not deploy any existing game.
- HLever does not copy production secrets, deploy keys, database files, or game asset packs.

## Patterns Worth Copying

- Branch and deploy commands fail closed when the checkout is on the wrong branch, dirty, or behind the matching remote.
- Runtime verification checks the deployed commit, not only HTTP 200.
- Maintenance mode is allowed but must be detectable through health, metrics, and release metadata.
- Public docs have their own deploy path and DNS checks.
- Issue handoffs include work done, validation, branch/PR, deploy evidence when relevant, and residual risk.
- Reroutes are documented and reviewed instead of becoming invisible local workarounds.
