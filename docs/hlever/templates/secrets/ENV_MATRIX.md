# Secrets and Environment Matrix

Use this as the starting matrix for a new game. Values here are placeholders only.

## Shared Studio Variables

| Variable | Secret? | Owner | Scope | Notes |
| --- | --- | --- | --- | --- |
| `HL_STUDIOS_MAINTENANCE_MODE` | No | Release owner | runtime | `1` enables shared maintenance. |
| `HL_STUDIOS_MAINTENANCE_DISCORD_URL` | No | Community/release | runtime | Stable public invite URL. |
| `HL_STUDIOS_DISCORD_BOT_TOKEN` | Yes | Studio ops | secret store | Used to regenerate maintenance invites or post announcements. |
| `HL_STUDIOS_DISCORD_ANNOUNCEMENTS_CHANNEL_ID` | No | Community | runtime/vars | Discord channel id is not a secret. |

## HL Accounts Consumer Variables

| Variable | Secret? | Owner | Scope | Notes |
| --- | --- | --- | --- | --- |
| `HL_ACCOUNTS_URL` | No | Studio ops | runtime | Account-service origin. |
| `HL_ACCOUNTS_CLIENT_ID` | No | Studio ops | runtime | Game OAuth client id. |
| `HL_ACCOUNTS_CLIENT_SECRET` | Yes | Studio ops | secret store | OAuth client secret. |
| `HL_ACCOUNTS_REDIRECT_URI` | No | Studio ops | runtime | Exact game callback URL. |
| `HL_ACCOUNTS_INTERNAL_TOKEN` | Yes | Studio ops | secret store | Server-to-server entitlement token. |

## Runtime Deploy Variables

| Variable | Secret? | Owner | Scope |
| --- | --- | --- | --- |
| `RUNTIME_URL` | No | Release owner | workflow/env |
| `RUNTIME_DEPLOY_HOST` | No | Ops | workflow/env |
| `RUNTIME_DEPLOY_USER` | No | Ops | workflow/env |
| `RUNTIME_DEPLOY_PORT` | No | Ops | workflow/env |
| `RUNTIME_DEPLOY_PATH` | No | Ops | workflow/env |
| `RUNTIME_SERVICE` | No | Ops | workflow/env |
| `RUNTIME_DEPLOY_KEY_PATH` | Local secret path | Developer | local only |
| `RUNTIME_DEPLOY_SSH_KEY` | Yes | Ops | GitHub secret |

## Public Docs Deploy Variables

| Variable | Secret? | Owner | Scope |
| --- | --- | --- | --- |
| `PUBLIC_SITE_URL` | No | Release owner | workflow/env |
| `PUBLIC_SITE_DEPLOY_HOST` | No | Ops | workflow/env |
| `PUBLIC_SITE_DEPLOY_USER` | No | Ops | workflow/env |
| `PUBLIC_SITE_DEPLOY_PORT` | No | Ops | workflow/env |
| `PUBLIC_SITE_DEPLOY_PATH` | No | Ops | workflow/env |
| `PUBLIC_SITE_DEPLOY_KEY_PATH` | Local secret path | Developer | local only |
| `PUBLIC_SITE_DEPLOY_SSH_KEY` | Yes | Ops | GitHub secret |
