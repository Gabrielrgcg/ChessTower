# AGENTS.md

This game repo follows the High Leverage Studios shell.

## Branch Workflow

For tracked implementation work:

```bash
git checkout staging
git pull --ff-only origin staging
git checkout -b codex/<short-task-name>
```

Open implementation PRs against `staging`. Production promotion is explicit from verified `staging` to `main`.

## GitHub Actions

Automatic GitHub Actions must never trigger from branch `push` events, direct commits, schedules, or routine PR open/update activity. Workflows should run only from merged PRs targeting `main` or `staging` by using `pull_request` `closed` events plus job-level `github.event.pull_request.merged == true` guards. Run local/Codex validation before merge instead of spending runner minutes on every branch commit.

## Deploy Terminology

- `deploy`, `staging deploy`, and `send to beta` mean staging.
- Production requires explicit wording such as `production deploy`, `prod deploy`, or `ship live`.
- Public docs deploy is separate from game runtime deploy.

## Runtime Contracts

Staging and production must expose:

- `GET /healthz`
- `GET /metrics`
- `GET /api/release`

Maintenance mode must keep operator surfaces reachable.

## GitHub Identity

Before GitHub writes where `@me` should mean the device user:

```bash
gh api user --jq .login
```

Proceed only when the result is the expected local account.

## Secrets

Do not commit secrets, deploy keys, private tokens, database dumps, webhook URLs, or production data. Use repository secrets, host environment variables, or local `.env` files.

## Task Completion

Before final handoff:

- run the relevant validation
- update player docs/patch notes if behavior is player-facing
- update the issue with work done, validation, branch/PR, deploy result, and residual risk
- verify no plan item, command, issue comment, deploy check, or PR step remains pending
