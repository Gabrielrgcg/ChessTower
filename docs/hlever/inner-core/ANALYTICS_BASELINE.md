# Product Analytics Baseline

The studio starts with first-party structured logs as the product analytics sink. A third-party provider requires a later retention, privacy, and routing decision.

## Event Envelope

```json
{
  "schema_version": 1,
  "event_id": "<unique-id>",
  "event_name": "session.started",
  "event_category": "session",
  "occurred_at": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "environment": "staging",
  "deployment_variant": "beta",
  "game_id": "<game-id>",
  "source_app": "<game-id>-game",
  "user_id": "<internal-user-id>",
  "session_id": "<internal-session-id>",
  "payload": {}
}
```

## Minimum Event Names

- `auth.account_created`
- `auth.login_succeeded`
- `auth.login_failed`
- `auth.logout`
- `session.started`
- `session.ended`
- `onboarding.milestone`
- `wave.started`
- `wave.ended`
- `run.reset`
- `run.retried`
- `economy.transaction`
- `premium.checkout`
- `premium.entitlement_changed`
- `progression.unlock`
- `content.interaction`

## Privacy Guard

Do not emit:

- email addresses
- phone numbers
- account handles
- character names
- raw wallet addresses
- IP addresses
- provider subject ids
- cookies
- authorization headers
- JWTs
- passwords
- reset tokens
- session tokens
- token hashes
- signatures
- raw payment secrets
- free-form chat or support text

Allowed identifiers are internal `user_id`, internal `session_id`, and stable non-human content ids.
