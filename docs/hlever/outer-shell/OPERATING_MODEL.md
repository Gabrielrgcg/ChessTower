# Studio Operating Model

HLever defines the repo and service shell around studio games. It should make routine work boring: issues describe intent, PRs carry implementation, staging proves behavior, production promotion is explicit, and deploy verification records what is live.

## Lanes

| Lane | Owner | Purpose | Done means |
| --- | --- | --- | --- |
| Backlog | Human | Intent, priority, and product sequencing. | Issue has clear scope or is parked intentionally. |
| Execution | Agent or engineer | Implement the requested change on a working branch. | Code/docs are changed, validated, committed, pushed, and in a PR when needed. |
| Review | Agent or engineer | Check for defects, regressions, missing tests, and release risk. | Findings are fixed or explicitly accepted. |
| Staging | Agent or release owner | Merge to `staging`, deploy to beta/staging, verify runtime surfaces. | Staging origin exposes the expected build and issue is ready for validation. |
| Production | Release owner | Promote verified staging candidate to `main`, deploy, verify live. | Production origin exposes the expected build and issue is closed as shipped. |

## Repository Roles

- `main`: intended production line.
- `staging`: integrated validation line.
- `codex/<task>`: active work branch.
- Issue: product intent and acceptance criteria.
- PR: reviewable implementation and validation record.
- Deploy command: release transport plus live verification.
- Public docs deploy: static documentation/legal/wiki transport, separate from runtime deploy.

## Handoff Requirements

Every handoff should state:

- Work done.
- Result or current verdict.
- Validation command and outcome.
- Branch and PR, if applicable.
- Deployed environment and live probes, if applicable.
- Blocker, residual risk, or follow-up, if applicable.

## Actions Budget and Notification Hygiene

- Run local or Codex validation before pushing when the check is available locally. Use targeted checks first, then full gates only when the release step needs that evidence.
- GitHub Actions should provide required CI, deploy, and audit evidence. It should not be the first debugging loop for avoidable lint, type, generated-file, or missing-secret failures.
- Automatic GitHub Actions must not use branch `push` triggers, direct-commit triggers, schedules, or routine PR open/update triggers. Use `pull_request` `closed` events for merged PRs targeting `main` or `staging`, guarded by `github.event.pull_request.merged == true`.
- CI workflows should use conservative path filters and split normal `staging` merge checks from production `main` gates.
- Expensive gates, deploys, public-doc refreshes, and Discord announcements should run only after merges to `main` or `staging`. Keep local scripts for operator reroutes instead of making manual Actions the normal path.
- Avoid long `sleep` or wait gates inside a runner. Use immediate post-verify sidecars, manual backfills, or platform-native environment controls where the target repo supports them.
- Repo code can reduce failure-email noise by preventing predictable failures. Personal GitHub email notification settings are user-owned and are not controlled by HLever templates.
- Do not silence real failures with `continue-on-error` just to suppress emails. Fix the trigger, preflight, branch guard, secret setup, or workflow ownership instead.

## Project Handoff Rules

- Do not hand off after only creating a branch.
- Do not hand off issue work before required validation and issue/PR communication are complete.
- Do not call deploy work done until the checkout is back on the required branch, synced with remote, deploy command returned success, live verification passed, and the issue or release note was updated as required.
- Keep one request thread on one branch and one PR unless replacement is explicitly requested or the old PR cannot be reused.
