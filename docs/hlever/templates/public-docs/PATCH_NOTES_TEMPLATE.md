# Patch Notes Template

Patch notes should be player-facing, low-spoiler, and short enough to publish to public docs and Discord.

```json
{
  "latestVersion": "v0.0.0",
  "releases": [
    {
      "version": "v0.0.0",
      "date": "YYYY-MM-DD",
      "headline": "<player-facing headline>",
      "summary": "<one or two sentences>",
      "tags": ["release"],
      "source": {
        "commitSha": "<full-git-sha>",
        "runtimeBuildId": "<build-id>",
        "publicDocsUrl": "https://docs.<game-domain>/notes.html"
      },
      "discord": {
        "status": "pending",
        "skipAnnouncement": false,
        "summaries": {
          "en-US": "<short Discord copy>",
          "pt-BR": "<localized Discord copy>",
          "pl-PL": "<localized Discord copy>"
        }
      }
    }
  ]
}
```

Infrastructure-only releases can set:

```json
{
  "discord": {
    "status": "skipped",
    "skipAnnouncement": true,
    "skipReason": "Infrastructure-only release."
  }
}
```

After publishing or backfilling a Discord announcement, update `discord.status` to `posted` or `backfilled` in the release source that the game uses for `/api/release`.
