# Persistence and Save Boundaries

Persistence ownership must be explicit before a game ships.

## Ownership Matrix

| Data | Owner | Notes |
| --- | --- | --- |
| Registered identity | HL Accounts | Stable account id and provider links. |
| Premium entitlement | HL Accounts | Games can cache derived status but not own the ledger. |
| Offline solo save | Client/device | Sync is optional and must handle conflicts. |
| Online save | Game server | Authoritative game database. |
| Co-op run state | Game server | Session host or authoritative service owns shared state. |
| Leaderboards | Game server | Must reject client-trusted scores. |
| Patch notes | Game/public docs | Public source plus release metadata. |

## Save Boundary Rules

- Never let HL Accounts own game-specific save/progression records.
- Never let a co-op ticket become the save owner.
- Offline cache can queue writes only for features with a documented merge or replay model.
- Server-authoritative economy, premium, or leaderboard changes must not trust offline client writes.
- Save migrations need rollback notes and telemetry.

## Conflict Policy Template

```md
Feature:
Local owner:
Server owner:
Conflict detector:
Merge rule:
Player-facing outcome:
Validation:
```
