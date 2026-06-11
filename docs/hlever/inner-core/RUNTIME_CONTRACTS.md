# Runtime Contracts

The Inner Core defines the behavior a game runtime must expose, regardless of engine or backend.

## Supported Game Modes

| Mode | Required behavior | Persistence owner | Network dependency |
| --- | --- | --- | --- |
| Offline single-player | Game can launch, save, and resume locally without accounts. | Client/local device. | None for core play. |
| Online single-player | Server owns authoritative save/progression and account-linked state. | Game server. | Required for play or for account-linked features. |
| Multiplayer | Server owns sessions, tickets, lobby state, and either shared run state or an approved host-authoritative P2P contract. | Game server for identity/session surfaces; game server or host peer for live simulation by contract. | Required. |
| Hybrid | Offline play works locally; online/account/co-op features sync or unlock when available. | Split by feature boundary. | Optional for offline, required for online features. |

## Required Runtime Surfaces

Every staging and production runtime must expose:

- `GET /healthz`
- `GET /metrics`
- `GET /api/release`

Local preview should expose the same surfaces when practical.

## Visual Presentation Contract

Games with animated sprites, polling snapshots, projectiles, cooldowns, or movement interpolation should adopt [VISUAL_TIMELINE_CONTRACT.md](VISUAL_TIMELINE_CONTRACT.md). Gameplay state stays authoritative on the server, while sprite presentation uses stable event ids, server timestamps, and active-asset preloading so repeated snapshots do not restart animations or remount moving actors.

Games that intentionally use host-authoritative peer-to-peer co-op should adopt [P2P_COOP_CONTRACT.md](P2P_COOP_CONTRACT.md). The server still owns account checks, tickets, public-room discovery, entitlement gates, and abuse limits; the host peer only owns live simulation under the documented message, snapshot, recovery, and diagnostics rules.

## Service Boundaries

- HL Accounts owns shared identity, OAuth, provider links, Lux balance, premium entitlement, and trusted internal entitlement reads.
- Game services own save state, progression, inventory, run/session state, co-op tickets, leaderboards, and game-specific analytics context.
- Public docs own static wiki, legal, patch notes, public guides, security files, and docs DNS.

## Maintenance Contract

Maintenance mode may block player pages and mutating routes, but it must keep operator visibility:

- `/healthz` stays reachable.
- `/metrics` stays reachable.
- `/api/release` exposes maintenance state or returns documented maintenance JSON after health and metrics pass.
- Brand assets needed by the maintenance page stay reachable where practical.

## Engine Neutrality

A Unity, Godot, browser, native, or server-rendered game can implement these contracts. TypeScript examples in this repo are reference adapters only.
