# Adoption Decisions

HLever turns reference behavior into copyable studio defaults. A game can deviate only when it documents an equivalent safety property.

## Required Defaults

| Decision | Default |
| --- | --- |
| Git flow | Feature branches with `codex/` prefix, PRs into `staging`, explicit promotion from `staging` to `main`. |
| Deploy wording | `deploy` means staging; production needs explicit production wording. |
| Runtime probes | `/healthz`, `/metrics`, and `/api/release` on local preview where practical, staging, and production. |
| Maintenance | Do not block `/healthz` or `/metrics`; allow `/api/release` to expose maintenance state. |
| Public docs | Treat docs/static site deploy and DNS as separate from game runtime deploy. |
| Skin resources | Treat optional resource bases as local-only or externally hosted inputs under `resources/`; never commit large packs or extracted assets. Offer `none`, `tibia`, and `custom` during bootstrap. |
| Skin-derived sprites | Require deterministic imports, source evidence, review promotion, strict cutover, geometry contracts, and parity audits before runtime use. |
| Visual timeline | Animated clients should merge server-timestamped events by id so repeated snapshots do not restart movement, cooldowns, projectiles, or effects. |
| P2P co-op | If a game uses host-authoritative peer sessions, keep server-owned tickets and public-room discovery, peer input/intent messages, host snapshots, recovery rules, and network diagnostics explicit. |
| Accounts | HL Accounts owns shared identity and premium; games own saves, progression, sessions, co-op, and gameplay databases. |
| Analytics sink | First-party structured logs until the studio approves another provider. |
| Secrets | Use placeholders in docs; repository secrets or host env own real values. |
| Reroutes | Record command/workflow reroutes and decide whether to fix, document, or leave as local-only. |

## Explicitly Optional

- SQLite, Postgres, object storage, or browser-only local storage.
- Fastify, Express, serverless functions, or engine-native HTTP.
- Vite, Unity WebGL, Godot HTML5, native desktop, or mobile build systems.
- Discord patch-note publishing for non-player-facing releases.
- Public wiki generation when a game does not ship public gameplay docs yet.
- P2P co-op when a game is server-authoritative, solo-only, or does not need shared live sessions.
- Skin resource packs, including `.resource.zip` archives, when a game does not need external resource customization.
- Skin sprite adapters when a game does not ship Skin-derived runtime visuals.

## Deviation Template

When a game cannot copy a default, record:

```md
Default:
Deviation:
Reason:
Equivalent safety property:
Validation command:
Owner:
Review date:
```
