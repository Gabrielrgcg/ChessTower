# Maintenance Mode Verification

Maintenance mode protects migrations and incidents, but it must not hide operator visibility.

## Environment Variables

```bash
HL_STUDIOS_MAINTENANCE_MODE=1
HL_STUDIOS_MAINTENANCE_DISCORD_URL=https://discord.gg/<stable-invite-code>
HL_STUDIOS_DISCORD_BOT_TOKEN=<bot-token>
<GAME_PREFIX>_MAINTENANCE_MODE=1
<GAME_PREFIX>_MAINTENANCE_DISCORD_URL=https://discord.gg/<stable-invite-code>
```

Game-specific overrides can narrow maintenance to one game while shared variables can coordinate studio-wide maintenance.

## Expected Behavior

| Route | Expected |
| --- | --- |
| `/healthz` | 200 JSON with build metadata and no secrets. |
| `/metrics` | 200 Prometheus text with maintenance gauge set to 1. |
| `/api/release` | 200 JSON with `maintenance.enabled: true`, or 503 JSON only if deploy verification explicitly accepts maintenance release responses after health and metrics pass. |
| Player shell | 503 branded maintenance page. |
| Mutating API routes | 503 JSON maintenance response. |
| Brand assets | 200 where practical so the maintenance page renders. |

## Verification

```bash
curl -i "$RUNTIME_URL/healthz"
curl -i "$RUNTIME_URL/metrics"
curl -i "$RUNTIME_URL/api/release"
curl -i "$RUNTIME_URL/"
```
