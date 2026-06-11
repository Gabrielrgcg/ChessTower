# Chess Tower Instructions

## Scope

- This repository is an offline mobile-first Web/PWA game prototype.
- Do not create GitHub repositories, open PRs, push, deploy, or report HLever adoption unless the user explicitly asks for that follow-up.
- Use the existing sprite sheets as canonical runtime art unless the user provides replacements.

## Validation

- Run `npm run task:done` before handoff after repository work.
- For frontend changes, verify the local app in a browser viewport after the build/tests pass.
- Keep HLever docs and scripts under `docs/hlever/` and `scripts/hlever/`.

## Runtime Contracts

- Keep `/healthz`, `/metrics`, and `/api/release` available as local static runtime surfaces.
- Core play must remain offline and localStorage-backed for this milestone.

## Asset Rules

- Runtime sprites live under `public/assets/sprites/`.
- The shipped runtime uses `player_sheet.png`, `enemy_sheet.png`, `tiles.png`, and `HUD.png`.
- Root copy sheets are source artifacts and should not be imported by runtime code.
