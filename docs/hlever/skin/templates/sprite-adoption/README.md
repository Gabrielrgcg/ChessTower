# Sprite Adoption Templates

Copy these templates into a game repo when it adopts a Skin package for runtime sprites.

## Files

- `visual-source-evidence.schema.json`: JSON Schema for generated runtime visual evidence records.
- `sprite-adoption-manifest.template.json`: starter manifest for package input, strict cutover gates, review promotions, audits, and runtime handoff.

## Expected Project Flow

1. Record the Skin package id, checksum, source path or URL, and importer version.
2. Generate runtime visual records with source evidence that matches `visual-source-evidence.schema.json`.
3. For corpses, preserve authoritative source ids before any slug/name candidate and report unresolved ids explicitly.
4. For recolorable outfits and vocations, preserve base frames, direction frames, addon layers, palette masks, default colors, and neutral color samples together.
5. Keep review workbench images, downloaded references, and contact sheets in an ignored local folder such as `.codex-local/visual-source-review/`.
6. Commit only the deterministic manifest, generated metadata needed by runtime, and small selected public assets that the project intentionally ships.
7. Rebuild service-worker precaches, offline manifests, or preload indexes after shipped asset files are tracked when those manifests hash tracked files.
8. Run strict cutover, visual parity, corpse resolution, outfit palette, neutral color, actor crop, UI atlas, effect/missile/status, and loot/currency checks before staging deploy.

## Adapter Notes

- Treat these files as contracts, not a required TypeScript implementation.
- If a project uses a different schema format, preserve the same fields and invariants.
- Keep project-specific exceptions small, named, and reviewed.
- Prefer "missing and reported" over silent source-backed fallback for authoritative visuals.
