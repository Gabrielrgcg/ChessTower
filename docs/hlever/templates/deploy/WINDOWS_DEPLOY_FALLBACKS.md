# Windows Deploy Fallbacks

Local Windows deploy blockers usually come from missing `ssh`, missing `rsync`, wrong key permissions, or path expansion differences.

## Preflight

```powershell
Get-Command ssh
Get-Command rsync
Test-Path $env:RUNTIME_DEPLOY_KEY_PATH
git branch --show-current
git status --short
```

## Preferred Fixes

- Install Git for Windows with OpenSSH available in `PATH`.
- Install MSYS2 or another trusted rsync package and add `rsync.exe` to `PATH`.
- Use a deploy key path under the current user's profile.
- If deploying from WSL, copy the key into the WSL filesystem and run `chmod 600` there instead of using a `/mnt/c/Users/...` key.

## Fallback Path

When local Windows tooling is blocked, use the repo-owned merge-triggered GitHub Actions deploy workflow for the same target. Record the reroute:

```md
Planned path:
Blocker:
Fallback:
Verification:
Durable fix:
```
