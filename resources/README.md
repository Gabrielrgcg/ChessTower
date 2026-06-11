# Local Skin Resources

Place optional local Skin resource packs here.

This folder is intentionally ignored by Git except for this README and `.gitignore`. HLever does not commit resource archives, extracted packs, source art, generated atlases, or licensed asset mirrors.

Example:

```text
HL_TibiaBaseSprites_final.resource.zip
```

The game runtime owns loading this folder. See `docs/hlever/skin/RESOURCE_BASES.md`.

## Standard Tibia Skin

When bootstrap selects the `tibia` Skin option, use this reference path as the standard local archive:

```text
C:\Users\Fabio\Downloads\GameDev\High Leverage Studios\HL_TibiaBaseSprites\dist\HL_TibiaBaseSprites_final.resource.zip
```

The approved package metadata is tracked by HLever in `docs/hlever/skin/STUDIO_RESOURCE_MANIFEST.json` when those docs are copied into a generated project. Treat that manifest as the hash and audit reference, but keep the archive and any extracted payload local-only.

Do not commit that archive. Copy or symlink it into this folder only when the game runtime loader expects it here.

If the game ships Skin-derived sprites, follow `docs/hlever/skin/SPRITE_ADOPTION_CONTRACTS.md` and keep review workbench output or extracted art in ignored local folders.
