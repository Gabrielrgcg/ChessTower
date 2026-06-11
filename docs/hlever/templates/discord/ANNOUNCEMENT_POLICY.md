# Discord Announcement Policy

Discord announcements are for player-facing releases and incidents that players need to know about.

## Announce

- new playable content
- balance changes players will feel
- progression, economy, premium, account, or co-op changes
- maintenance windows
- incident resolution with player impact

## Skip

- CI-only changes
- internal docs
- refactors with no behavior change
- observability-only changes
- deploy-wrapper cleanup with no player impact

## Required Config

```bash
HL_STUDIOS_DISCORD_BOT_TOKEN=<bot-token>
HL_STUDIOS_DISCORD_ANNOUNCEMENTS_CHANNEL_ID=<channel-id>
HL_STUDIOS_DISCORD_WEBHOOK_URL=<webhook-url>
```

Prefer bot or webhook config owned by repository/environment secrets. Do not put webhook URLs in committed docs or issue comments.

## Release Guard

Announcement publishing should happen after runtime verification passes. If production is still in maintenance mode, skip player-facing release announcements unless the announcement is explicitly about maintenance.

## Sidecar Behavior

Treat announcements as post-verification sidecars:

- run only after runtime and required public docs verification pass
- record skipped announcements with a player-safe reason
- support manual backfill when a release was verified but publishing failed
- never block rollback or incident response on announcement publishing
- never include private deploy URLs, webhook URLs, tokens, or unannounced exploit details
