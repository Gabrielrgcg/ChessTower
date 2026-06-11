# GitHub Actions Deploy Fallback

Use this when a repo has not yet promoted merge-triggered GitHub Actions deploys to its normal deploy path and a local deploy cannot run because local SSH, rsync, deploy key access, or platform tooling is blocked. For mature High Leverage Studios repos, GitHub Actions should be the default repeatable deploy path after merges to `main` or `staging`, and this document becomes the reroute checklist.

## Requirements

- The candidate was merged into the intended `main` or `staging` branch.
- The deploy workflow checks out the exact intended ref.
- Repository or environment secrets contain the deploy private key.
- Environment variables define host, user, path, service, and runtime URL.
- The workflow runs the same deploy script used locally.

## Required Evidence

Record in the issue or release handoff:

- workflow run URL
- candidate commit SHA
- deployed environment
- `/healthz` result
- `/metrics` result
- `/api/release` result
- whether this was a local-only reroute or requires a repo/tooling fix
