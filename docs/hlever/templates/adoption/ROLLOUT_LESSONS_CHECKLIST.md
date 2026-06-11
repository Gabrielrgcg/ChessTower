# HLever Rollout Lessons Checklist

Use this checklist before a new game treats HLever adoption as complete. It captures the lessons from applying HLever to Utevo Lux and the follow-up bugfixes that happened after the first import.

## Deploy and Release

- Runtime deploy verification must prove the deployed commit, not only that the host is reachable.
- Shared studio services, especially HL Accounts, need their own deploy contract and compatibility probes before a game release depends on them.
- `GET /healthz`, `GET /metrics`, and `GET /api/release` must expose enough build, maintenance, and dependency state to verify staging and production without leaking secrets.
- GitHub Actions should be the default repeatable deploy path when repository workflows exist, but automatic workflows should run only after merged PRs targeting `main` or `staging`; local deploy scripts are operator fallbacks.
- Discord announcements run only after runtime verification passes, and skipped/backfilled announcements must be recorded.
- Release catalog data should identify the current player-facing patch notes entry, public docs source, update mode, and announcement status.

## Accounts

- First-time account registration must be exercised from the game, not only the shared account service.
- Passkey, OAuth, redirect URI, client ID, and internal entitlement failure modes must be visible in logs and metrics without recording codes, cookies, tokens, or private provider subjects.
- Account-gated features fail closed when account verification is unavailable; offline solo modes remain available when the game supports offline play.

## Multiplayer and P2P Co-op

- Co-op tickets must be scoped, expiring, audience-bound, and separate from account sessions, public-room records, saves, and progression.
- Public P2P room discovery needs short TTL heartbeats, no-store browse responses, build/protocol filtering, safe peer ids, capacity checks, and entitlement rechecks where applicable.
- Host-authoritative P2P must keep peer messages input/intent-only and send authoritative lobby sync, snapshots, corrections, rewards, progress, and recovery messages from the host.
- Snapshot and visual-event sync need sequence ids, input acknowledgements, bounded full-snapshot recovery, stale-base fallback, queue caps, and backpressure behavior.
- Reconnect, party close, spectator-only, kicked-player, leader-transfer, and host-migration behavior should be tested before a P2P game calls adoption complete.
- Network diagnostics should expose ticket failures, public-room failures, RTT, jitter, snapshot rate, input rate, bytes, drops, corrections, and backpressure without logging secrets or raw private network details.

## Public Docs and Adoption Drift

- Public docs deploys are separate from game runtime deploys; stale docs should fail the public docs gate, not hide inside a runtime incident.
- Generated docs, wiki exports, and patch-note data must be committed or intentionally excluded before a deploy branch is considered clean.
- Projects should keep an adoption drift note or checklist showing which HLever contracts were copied, adapted, skipped, or superseded.

## Skin and Visuals

- Skin imports must be deterministic. Generated provenance should use package metadata, not wall-clock timestamps.
- Runtime visuals must have source evidence, review status, and a cutover gate that prevents legacy asset namespaces from returning silently.
- UI primitives, scene visuals, item/equipment sprites, actor sprites, spell visuals, loot/currency, and review-only candidates must follow the Skin sprite adoption contract.
- Corpse resolution must prefer authoritative source corpse ids over slug/name candidates, and missing authoritative corpses must be reported explicitly.
- Recolorable outfits and vocations must carry palette masks, default colors, addon layers, walking frames, and neutral color samples through the same runtime path.
- Gray or neutral outfit colors need their own regression samples so neutral targets do not get classified as blue or another saturated hue.
- Effects, missiles, runes, and status visuals should have deterministic source mapping, runtime category metadata, and smoke tests.
- Generated offline manifests, service-worker precaches, and preload indexes should be rebuilt after shipped asset files are tracked when they use tracked-file hashes.

## Local Development

- A project that needs account, deploy, public-docs, or Skin services should provide local presets or mocks so basic validation is fast and does not depend on production-like services.
- Long-running validation and deploy commands should have a polling or log strategy before they become release blockers.
