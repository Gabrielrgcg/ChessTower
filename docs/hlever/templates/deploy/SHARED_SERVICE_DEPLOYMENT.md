# Shared Service Deployment Template

Use this for studio services consumed by more than one game, such as HL Accounts. A shared service deploy can block a game release even when the game runtime is healthy.

## Required Contract

Each shared service should document:

- service id and owner
- staging URL and production URL
- current deploy command or GitHub Actions workflow
- health probe
- metrics probe
- release probe
- consumer compatibility probe
- rollback or restore procedure
- game repos currently depending on the service

## HL Accounts Compatibility Probes

Before a game deploy depends on an HL Accounts change, verify:

- OAuth authorize route accepts the game client id and redirect URI.
- OAuth callback exchange succeeds with the staging game redirect URI.
- First-time registration works through the game-facing flow.
- Existing player login works through the game-facing flow.
- Internal entitlement reads fail closed on bad credentials and return non-sensitive errors.
- Metrics count auth failures without labels containing email, provider subject ids, cookies, authorization headers, or OAuth codes.
- `/healthz`, `/metrics`, and `/api/release` expose the service build SHA and environment.

## Consumer Handoff

Record this in the game issue or release handoff when a shared service was part of the release:

```md
Shared service:
Service environment:
Service commit:
Service deploy run:
Compatibility probes:
Game client id:
Game redirect URI:
Known incompatibilities:
Rollback path:
```

Do not include client secrets, internal service tokens, cookies, private keys, or provider account identifiers.
