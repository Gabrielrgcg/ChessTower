# GitHub Issue and PR Lifecycle

## Issue Intake

Before implementation:

1. Read the issue and acceptance criteria.
2. Confirm the repo target and whether the issue is single-repo or cross-repo.
3. If GitHub writes are needed on this Windows profile, run `gh api user --jq .login` and continue only when it returns `frizas`.
4. Assign yourself when the repo workflow requires it.
5. Sync the required base branch and create or reuse the request branch.

## Working Branch

Default branch shape:

```bash
git checkout staging
git pull --ff-only origin staging
git checkout -b codex/<short-task-name>
```

Initial HLever bootstrap is the only expected exception, because the repository does not have a remote until the first push.

## Local Preflight Before Push

- Run the cheapest useful local check before pushing. For broad changes, prefer `npm run task:done`; for narrow changes, run the affected lint, test, build, or deploy-prep command first.
- Push only after generated tracked files are committed or the generator is corrected to leave the worktree clean.
- Before merging into `staging` or `main`, verify the required deploy branch, secret names, and local preflight where possible. A missing deploy secret should be found before the merge-triggered runner is started.
- Avoid blind reruns of failing workflows. Inspect the failed job, reproduce narrowly, and rerun only the failed job when a rerun is justified.

## PR Rules

- Normal implementation PRs target `staging`.
- Production promotion requires explicit wording and should be either a promotion PR or a fast-forward/merge from the verified staging candidate according to the game repo's rules.
- PR body should link the issue. Use `closes #<issue>` only when merging the PR should close the issue.
- Keep review fixes on the same branch and PR.

## Issue Comments

Use issue comments for milestone handoffs, not only PR comments. Each comment should include:

- What changed.
- Current verdict.
- Validation and deploy verification.
- Branch/PR references.
- Remaining risk or blocker.

## Project Board Corrections

Project automation owns normal movement. Manual corrections should be rare and limited to clear lifecycle points:

- newly created Codex work to `Todo` if automation missed it
- active Codex work to `Doing`
- staging-complete work to `Validation`
- production-complete work to `Done`

Record any manual correction in the issue comment.
