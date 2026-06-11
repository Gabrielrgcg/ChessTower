# Chess Tower

Chess Tower is an offline mobile-first chess roguelite prototype. The board scrolls upward one tile after each player turn, tactical enemy formations enter from the top, and the run ends if no heroic allied piece remains on-screen.

## Run

```powershell
npm install
npm run dev
```

Open the Vite URL on a mobile-sized viewport. The game uses the local sprite sheets under `public/assets/sprites/`.

## Validation

```powershell
npm run test
npm run build
npm run task:done
```

`task:done` runs unit tests, HLever JSON/link/secret validation, and the production build.

## HLever

This project adopted HLever in existing-game mode. HLever shell docs live under `docs/hlever/`, validation scripts under `scripts/hlever/`, and adoption metadata in `HLEVER_ADOPTION.md`.
