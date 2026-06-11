# Public Docs Deployment Template

Public docs are a static surface for wiki, patch notes, legal pages, security files, and public guides. They are not the game runtime and should not depend on the runtime database.

## Variables

```bash
PUBLIC_SITE_URL=https://docs.<game-domain>/
PUBLIC_SITE_DEPLOY_HOST=<host>
PUBLIC_SITE_DEPLOY_USER=<user>
PUBLIC_SITE_DEPLOY_PORT=22
PUBLIC_SITE_DEPLOY_PATH=/var/www/docs.<game-domain>
PUBLIC_SITE_DEPLOY_KEY_PATH=~/.ssh/<public-docs-key>
```

## Verification

```bash
curl -I "$PUBLIC_SITE_URL/"
curl -I "$PUBLIC_SITE_URL/robots.txt"
curl -I "$PUBLIC_SITE_URL/security.txt"
curl -I "$PUBLIC_SITE_URL/privacy.html"
curl -I "$PUBLIC_SITE_URL/terms.html"
```

If public docs are stale while runtime is healthy, treat it as a public docs deploy or DNS incident, not as a game runtime incident.

## Fail-Closed Rules

Public docs deploys should fail when:

- patch notes reference a release entry that was not generated
- legal, privacy, terms, security, or contact files expected by the game are missing
- wiki or mechanics exports changed locally but were not committed or intentionally excluded
- the public docs URL points at a stale commit after deploy

Do not publish a player-facing Discord announcement for docs-dependent releases until the docs verifier has passed or the announcement explicitly states the docs delay.
