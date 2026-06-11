# Review, Reroute, Incident, and Handoff Rules

## Review Loop

Review should prioritize:

- behavioral bugs
- missing regression coverage
- deploy or rollback risk
- auth, persistence, economy, or premium boundary mistakes
- telemetry gaps that would make staging or production incidents harder to resolve
- public docs or patch-note drift for player-facing changes

Fix actionable findings on the same branch and PR. Repeat review until no blocking findings remain.

## Reroute Review

A reroute is any planned path changed because local tools, provider access, missing secrets, platform differences, CI drift, deploy verifier false failures, or host state prevented the normal command.

Record:

- planned command or path
- blocker
- fallback used
- whether the fallback changes release risk
- durable fix, doc update, follow-up issue, or local-only verdict

## Incident Handling

During an incident:

1. Identify affected environment and service.
2. Check `/healthz`, `/metrics`, and `/api/release`.
3. Confirm build metadata and maintenance state.
4. Inspect structured logs using request ids, trace ids, user ids, session ids, or route labels.
5. Separate public docs/DNS incidents from runtime incidents.
6. Prefer rollback or maintenance mode over risky live edits.
7. Write the incident note with timeline, detection, impact, mitigation, root cause, and follow-up.

## Handoff Template

```md
Work done:
Validation:
Branch/PR:
Deploy verification:
Reroutes:
Residual risk:
Next owner:
```
