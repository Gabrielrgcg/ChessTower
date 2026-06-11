# Release and Deploy Flow

## Terminology

| Term | Meaning |
| --- | --- |
| `deploy` | Staging deploy unless the user explicitly says production. |
| `staging deploy`, `beta deploy`, `send to staging` | Deploy the synced `staging` branch to the staging runtime. |
| `production deploy`, `prod deploy`, `ship live`, `release live` | Promote the verified staging candidate to `main` and deploy production. |
| `public docs deploy` | Deploy the static docs/legal/wiki site. It is separate from the game runtime. |

If wording mixes `deploy live` without naming staging or production, ask before production.

## Staging Flow

1. Finish implementation on the work branch.
2. Run targeted validation.
3. Push the branch and open/update the PR against `staging`.
4. Review and fix blockers.
5. Merge to `staging`; merge-triggered Actions run the staging checks and deploy workflow.
6. Checkout `staging`, pull `origin/staging`, and verify local HEAD matches remote.
7. If the merge-triggered deploy cannot run because of local-only or secret access limits, use the repo's local staging deploy command as an operator reroute and record it.
8. Verify:
   - player URL
   - `GET /healthz`
   - `GET /metrics`
   - `GET /api/release`
   - public docs if docs, patch notes, wiki exports, or legal/security files changed
9. Update or close the issue according to the repo lifecycle.

## Production Flow

1. Confirm explicit production wording.
2. Confirm staging candidate is already merged and verified.
3. Sync `main` and `staging`.
4. Promote the verified staging candidate to `main` through a PR/merge path.
5. Merge to `main`; merge-triggered Actions run the production gate and deploy workflow.
6. If the merge-triggered deploy cannot run because of local-only or secret access limits, use the repo's local production deploy command as an operator reroute and record it.
7. Confirm the promoted commit matches `origin/main`.
8. Verify:
   - live player URL
   - `GET /healthz`
   - `GET /metrics`
   - `GET /api/release`
   - public docs URL if docs changed
   - post-verification Discord announcement or recorded skip/backfill status
9. Close or update the issue with production evidence.

## Required Deploy Invariants

Before a runtime deploy:

- Branch is `staging` for staging or `main` for production.
- `git status --short` is empty.
- HEAD matches the corresponding remote branch.
- Build metadata injected into the runtime matches the commit being deployed.
- Maintenance mode, if enabled, is represented in `/metrics` and `/api/release`.
- Generated public docs, wiki exports, patch notes, Skin manifests, visual evidence, offline manifests, service-worker precaches, and preload indexes are either committed or intentionally ignored.

## Actions-Minute Defaults

- Automatic workflows must not trigger on branch `push`, direct commits, schedules, or routine PR open/update events.
- CI, production gates, staging deploys, production deploys, public-doc refreshes, and Discord announcements should use `pull_request` `closed` events for merged PRs targeting `main` or `staging`, with `github.event.pull_request.merged == true` job guards.
- Use path filters for expensive checks when only specific repo areas require them.
- Deploy workflows may run targeted staging verification, but the normal expectation is that Codex or the operator already ran local preflight before merge.
- Discord announcements should not wait inside a runner. Publish immediately after production verification or use a local/operator backfill when the announcement needs human timing.
- Failure emails should represent real action needed. Reduce noise by fixing bad triggers, duplicated checks, stale generated files, missing preflight, and missing secrets; do not mask real deploy failures as success.

## Actions-Minute Defaults

- Production gates, staging deploys, production deploys, public-doc refreshes, and Discord announcements are `workflow_dispatch` by default.
- Scheduled Actions are opt-in. Use them only when the game has a concrete recurring operational need and an owner for the notification stream.
- Production gates should only run from `main`; staging deploys should only run from `staging`. Wrong-branch manual dispatches should skip rather than fail.
- Deploy workflows may run targeted staging verification, but the normal expectation is that Codex or the operator already ran local preflight before pushing and dispatching.
- Discord announcements should not wait inside a runner. Publish immediately after production verification or run a manual backfill workflow when the announcement needs human timing.
- Failure emails should represent real action needed. Reduce noise by fixing bad triggers, duplicated checks, stale generated files, missing preflight, and missing secrets; do not mask real deploy failures as success.

## Sidecars

Run player-facing sidecars only after runtime verification succeeds:

- public docs deploys for docs, legal, wiki, or patch-note changes
- Discord announcements for player-facing releases
- local/operator backfills for skipped announcements or stale public docs

If a sidecar fails after the runtime is healthy, record it as a docs or announcement incident instead of silently folding it into the runtime deploy result.

## Reroute Rule

If local `ssh`, `rsync`, deploy keys, provider CLI, workflow secrets, or host access block the normal path, use the safest supported fallback and record the reroute. Before final handoff, decide whether the reroute needs a repo fix, documentation update, follow-up issue, or no action because it is local-only.
