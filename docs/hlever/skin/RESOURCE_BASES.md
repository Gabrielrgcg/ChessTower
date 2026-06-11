# Skin Resource Bases

Skin is the optional HLever layer for local resource bases. It lets a game customize itself with resources from another game or shared studio pack while keeping HLever engine-neutral and asset-free.

## Contract

- Skin is optional. A game must still build, validate, and expose required HLever runtime surfaces without a Skin pack unless that game explicitly documents a different product requirement.
- Resource packs are local or externally hosted inputs. Do not commit large archives, extracted sprite sheets, generated atlases, private source art, or licensed third-party assets to HLever or a game repo.
- The conventional drop folder in generated game repos is `resources/`.
- The game runtime owns loading and validation. HLever only defines the folder, ignore rules, and documentation convention.
- A resource archive may use the suffix `.resource.zip`, such as `HL_TibiaBaseSprites_final.resource.zip`.
- Generic UI glyphs should default to Lucide in adopter UIs. Keep Skin for resource packs, gameplay art, and project-specific iconography that genuinely needs source art or evidence.

## Standard Skin Options

The bootstrapper offers these Skin choices:

| Choice | Meaning | Reference |
| --- | --- | --- |
| `none` | No Skin resource base selected. | None. |
| `tibia` | Standard Tibia Skin resource base. | `C:\Users\Fabio\Downloads\GameDev\High Leverage Studios\HL_TibiaBaseSprites\dist\HL_TibiaBaseSprites_final.resource.zip` |
| `custom` | A game-specific local path or external URL entered during bootstrap. | Recorded in the generated project's adoption metadata. |

The Tibia path is a reference to the standard local archive, not a file HLever copies. If another machine stores the archive somewhere else, update the generated project's notes while keeping the archive untracked.

`STUDIO_RESOURCE_MANIFEST.json` records the current approved standard Tibia package by reference, SHA-256 hash, package counts, and audit status. It is metadata for consumers and tooling; the resource archive itself remains local-only and must not be committed to HLever or generated game repos.

If a game ships Skin-derived sprites at runtime, it should also adopt [SPRITE_ADOPTION_CONTRACTS.md](SPRITE_ADOPTION_CONTRACTS.md). That contract defines source evidence, authoritative corpse resolution, outfit palette masks, neutral color samples, review promotion, visual cutover, geometry, UI atlas, actor, currency, effect/missile/status, parity-audit, and runtime-handoff expectations learned from the first HLever rollout.

## Generated Project Convention

Generated projects include:

- `resources/README.md`
- `resources/.gitignore`
- `docs/hlever/skin/SPRITE_ADOPTION_CONTRACTS.md`
- `docs/hlever/skin/templates/sprite-adoption/`
- `public/brand/high-leverage-studios-logo.png`
- `public/brand/luxcoin.png`
- `public/brand/luxcoin-sheet.png`
- `public/brand/luxcoin.frames.json`
- root `.gitignore` rules that ignore `resources/*` and `*.resource.zip`
- validation scripts that skip `resources/`

To use a local Skin pack, place the archive under `resources/` and implement the game-specific loader in that game repo.

Example:

```text
resources/
  HL_TibiaBaseSprites_final.resource.zip
```

The archive should remain untracked. If a game needs to share a required Skin pack across machines, document the source, checksum, license/permission boundary, and setup command without copying the archive into Git.

Runtime sprite adopters should keep review workbench output, downloaded references, contact sheets, extracted source art, and generated atlases in ignored local folders. Commit only deterministic manifests, small intentional public assets, and runtime metadata that the game actually needs.

When HLever is merged into an existing game, an existing `resources/` folder is not blindly overwritten. Template-only folders are refreshed, untracked/local-only folders are moved to `.codex-local/hlever-deprecated/<timestamp>/resources/`, and tracked resource files require a manual migration decision recorded in `HLEVER_MERGE_REPORT.md`.

## Adoption Notes

When a game relies on a Skin pack, record:

```md
Skin pack:
Source:
Bootstrap choice:
Local path:
Required for build:
Required for runtime:
Checksum:
Loader owner:
Validation command:
License or permission notes:
```
