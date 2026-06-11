# Adoption Checklist

Use this checklist when adopting HLever in a game repo.

## Repo Shell

- Add or update game `AGENTS.md`.
- Add issue forms for implementation, deploy, and incident work.
- Add CI workflow.
- Document branch flow and deploy terminology.
- Add validation command that the repo treats as task completion.
- Review [HLever Rollout Lessons Checklist](ROLLOUT_LESSONS_CHECKLIST.md) and record deviations.
- For existing games, review [Existing Game Merge](EXISTING_GAME_MERGE.md) and `HLEVER_MERGE_REPORT.md` before merging candidates into root game files.

## Runtime

- Implement `GET /healthz`.
- Implement `GET /metrics`.
- Implement `GET /api/release`.
- Add maintenance mode that keeps operator surfaces reachable.
- Add release/build metadata injection.
- Add deploy verification that checks the deployed commit.
- If the game has animated sprites or polling snapshots, adopt the visual timeline contract.

## Multiplayer and P2P Co-op

- Define co-op/session ticket scope if multiplayer exists.
- If the game uses P2P co-op, adopt `docs/hlever/inner-core/P2P_COOP_CONTRACT.md`.
- Add ticket issue/verify checks for expiry, audience, scope mismatch, closed sessions, and missing or malformed peer identity.
- Add public-room list, heartbeat, and close checks for build-version filtering, short TTL expiry, capacity, safe peer ids, no-store responses, and entitlement gates where applicable.
- Add host-bound and peer-bound message allowlists so peers send input/intent and hosts send authoritative lobby, snapshot, correction, reward, and recovery messages.
- Add snapshot and visual-event checks for full/delta recovery, input acknowledgement, movement correction, queue caps, and backpressure drops.
- Add reconnect, party close, spectator, kicked-player, leader-transfer, and host-migration scenarios if those features exist.
- Record P2P diagnostics without OAuth tokens, cookies, client secrets, raw IP addresses, payment data, or private account identifiers.

## Accounts and Persistence

- Document HL Accounts OAuth client id and redirect URI.
- Verify first-time registration and existing-player login through the game-facing flow.
- Add account auth metrics and logs that expose failure class without secrets or provider subject ids.
- Keep game saves/progression game-local.
- Define offline save ownership and merge rules.

## Public Docs and Announcements

- Add patch-note source.
- Add public docs deploy or explicitly mark public docs out of scope.
- Add Discord announcement policy.
- Make Discord publishing a post-verification sidecar, with skipped/backfilled announcements recorded.
- Keep legal/security files reachable from static docs if the game has a public docs surface.

## Skin Resources

- Keep optional resource packs under local-only `resources/`.
- Do not commit `.resource.zip` archives, extracted packs, generated atlases, source art, or licensed asset mirrors.
- If using the standard Tibia Skin, record the reference path from `docs/hlever/skin/RESOURCE_BASES.md` or the machine-specific replacement path.
- Document the resource source, checksum, loader owner, and validation command if the game requires a Skin pack.
- If Skin-derived sprites ship at runtime, adopt the sprite source evidence schema, review promotion manifest, strict visual cutover gate, and visual parity audits from `docs/hlever/skin/SPRITE_ADOPTION_CONTRACTS.md`.
- For corpses, require authoritative source ids to outrank slug/name guesses and keep an explicit missing-corpse report.
- For recolorable outfits and vocations, verify palette masks, default colors, addon layers, walking frames, and neutral color samples through the runtime recolor path.
- For effects, missiles, runes, and status visuals, require deterministic source mapping, runtime category metadata, and visual smoke tests.
- Rebuild generated service-worker precaches, offline manifests, or preload indexes after shipped asset files are tracked when those manifests hash tracked files.
- Use Lucide as the default icon library for generic UI glyphs before reaching for generated icons or new bespoke SVGs.

## Validation

- Run local validation.
- Run staging deploy and probe `/healthz`, `/metrics`, `/api/release`.
- Verify generated public docs, patch notes, wiki exports, Skin manifests, offline asset manifests, and service-worker precaches are either committed or intentionally excluded before deploy.
- Record deviations from HLever defaults.
