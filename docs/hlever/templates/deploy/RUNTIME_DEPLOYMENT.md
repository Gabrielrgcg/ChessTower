# Runtime Deployment Template

Use this as the game runtime deploy contract. Replace placeholders in the game repo.

## Required Variables

```bash
RUNTIME_URL=https://<runtime-origin>/
RUNTIME_DEPLOY_HOST=<host>
RUNTIME_DEPLOY_USER=<user>
RUNTIME_DEPLOY_PORT=22
RUNTIME_DEPLOY_PATH=/srv/<game-service>
RUNTIME_SERVICE=<systemd-service>
RUNTIME_DEPLOY_KEY_PATH=~/.ssh/<runtime-key>
```

## Build Metadata

Deploy wrappers should inject:

```bash
HL_STUDIOS_BUILD_ID=<build-id>
HL_STUDIOS_BUILD_SHA=<full-git-sha>
HL_STUDIOS_BUILD_SHA_SHORT=<short-git-sha>
HL_STUDIOS_BUILD_VERSION=<display-version>
HL_STUDIOS_BUILD_COMMITTED_AT=<iso-8601-utc>
HL_STUDIOS_RELEASE_UPDATE_MODE=<prompt|force|silent|service-worker-offline-cache>
HL_STUDIOS_PATCH_NOTES_SOURCE=/data/patch-notes.json
```

Game repos may map these to local variable names at build time, but `/healthz`, `/metrics`, and `/api/release` must expose equivalent data.

## Default Deploy Automation

When the repo has GitHub Actions deploy workflows, make the workflow the default Codex-safe deploy path. The workflow should:

- trigger only from a merged PR targeting `staging` or `main`, not from branch pushes, direct commits, schedules, or routine PR updates
- check out the exact intended ref
- install dependencies from lockfile
- run the environment validation gate
- deploy with repository or environment secrets
- verify the deployed URL and release SHA before reporting success

Local deploy scripts should remain available for operators and emergency reroutes, but they should not be the only documented path.

## Local Deploy Sequence

```bash
git checkout staging
git pull --ff-only origin staging
git status --short
npm run verify:staging
npm run staging:deploy
curl "$RUNTIME_URL/healthz"
curl "$RUNTIME_URL/metrics"
curl "$RUNTIME_URL/api/release"
```

Production follows the same shape from synced `main` after explicit promotion.

## Post-Deploy Verification

The deploy is not complete until the verifier confirms:

- player URL returns the expected page or maintenance response
- `/healthz` reports the expected service id, environment, and commit
- `/metrics` exposes build, maintenance, process, and relevant subsystem families
- `/api/release` reports the expected release catalog and update mode
- public docs changed in the same release are deployed and reachable
- Discord announcements, if any, ran after verification or were intentionally skipped/backfilled
