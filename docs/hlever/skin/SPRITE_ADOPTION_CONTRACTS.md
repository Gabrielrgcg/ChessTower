# Sprite Adoption Contracts

This contract turns a Skin package from a local archive into a repeatable sprite adoption process. It is engine-neutral: projects can adapt it to browser canvas, DOM, Unity, Godot, native renderers, or server-side asset pipelines.

## Required Artifacts

A project using Skin sprites should maintain:

- a deterministic importer that records the Skin package id, package hash, package timestamp, and generated output version
- visual source evidence for every runtime sprite record
- a review promotion manifest for approved and rejected review-only candidates
- a strict cutover gate that fails on unapproved legacy visual namespaces
- an explicit missing-asset report for authoritative visuals that did not resolve
- local-only review workbench output for contact sheets, CSV/JSON scoring, and reference captures
- visual parity audits for high-risk sprite classes
- generated runtime manifests and offline caches rebuilt after shipped assets are tracked

Use the templates under [templates/sprite-adoption](templates/sprite-adoption/README.md) as the starting point.

## Source Evidence

Each runtime visual record should be able to answer:

- what runtime thing uses this sprite
- which package/source record produced it
- which matching rule selected it
- which authoritative source id, if any, selected it
- whether it is exact, semantic, review-promoted, project override, or non-game exception
- what canvas, trim, footprint, anchor, direction, addon, palette mask, color, and animation data the renderer should use

Do not generate source evidence with wall-clock timestamps. Use deterministic package metadata or a fixed generated output version so repeated imports do not dirty the branch.

## Mapping Precedence

| Sprite kind | Required precedence |
| --- | --- |
| Items and equipment | Explicit project override, exact normalized semantic/catalog name, verified client visual id, then legacy numeric id only if audited. |
| Scene and map tiles | Explicit project override, client visual id or map-layer evidence, then reviewed semantic candidate. |
| Monsters and NPCs | Exact package identity, reviewed outfit/lookType evidence, reviewed cross-kind actor fallback, then explicit project override. |
| Corpses | Authoritative source corpse id, item id, or client visual id from the actor/source data, then reviewed project override, then reviewed semantic candidate. Normalized monster names or slug matches must not outrank authoritative corpse ids. |
| Outfits and vocations | Look type, direction, animation frame, addon, palette mask, default colors, neutral color samples, and color metadata must stay together for every recolorable actor. |
| Spells | Spell source record, words/name/source script, effect or missile constant, then explicit temporary exception. Spell ids are not atlas cell ids. |
| Effects, missiles, runes, and statuses | Source effect/missile/status constant or catalog identity, runtime category, render sequence metadata, then explicit project override. |
| UI controls | Role and state metadata, not guessed atlas cells. Buttons, slots, pagination, checkboxes, comboboxes, bars, fills, frames, and disabled/hover states must be sliced by purpose. Prefer Lucide for generic button/state glyphs; use custom art only when the project has explicit visual evidence or a brand/game-specific need. |
| Loot and currency | Logical item id remains separate from visual denomination, stack stage, and compact render grouping. |

## Corpse Resolution

Corpse mapping is high risk because name-based guesses often look plausible. Importers should treat source corpse ids, such as XML `look corpse` values or equivalent client visual ids, as authoritative. Slug or normalized-name matching may be used only after the authoritative id is absent and the candidate is reviewed.

Each corpse audit should report:

- actor runtime key and display name
- authoritative corpse source id and source path
- selected runtime corpse sprite path and source record
- whether a slug/name candidate existed and was rejected because authority won
- unresolved or missing authoritative ids with the runtime behavior chosen for each case

Missing corpses should be explicit report rows. Do not silently fall back to a similarly named corpse when the source data names a different id.

## Outfit Palette And Neutral Colors

Recolorable outfits and vocations must keep their base frames, walking sheets, addon layers, palette masks, default colors, and neutral color samples in one source evidence record or in records linked by a stable runtime key. A default class or starter outfit is still recolorable if it uses the same Skin sheet and mask process as the other classes.

Neutral colors need their own visual samples. A gray or neutral target should stay low-saturation after recoloring and must be tested separately from saturated colors such as blue and purple. Projects should keep pixel or screenshot checks for at least:

- default/unrecolored outfit
- neutral gray or low-saturation target
- saturated warm target
- saturated cool target
- addon on/off states when addons exist

## Geometry Contract

Renderer adapters should keep these concepts separate:

- source canvas: original sprite canvas from the package
- render trim: visible pixels used for efficient drawing
- battlefield footprint: gameplay footprint for selection, collision, corpse size, and target rings
- UI bounds: layout box for inventories, cards, panels, and previews
- anchors: projectile, reticle, floating text, health/mana bar, and nameplate attachment points
- direction frames: north, east, south, west, plus any diagonal or engine-specific directions
- animation mode: static idle, walking sheet, effect sequence, missile sequence, UI state, or atlas slice
- palette mask: recolor mask or indexed-palette data separate from the rendered base sheet
- addon layers: optional visual layers that must preserve the same direction, trim, and animation cadence as the base outfit

Corpse, loot, monster, and UI rendering must preserve aspect ratio unless the project has an explicit reviewed reason to stretch.

## Review Promotion

Review-only candidates are blocked from runtime until promoted. Promotion should require:

- approved status in a tracked review manifest
- matching resource package hash or source evidence hash
- target runtime key still exists
- source record still exists and has non-empty art
- rejected status absent for that target/source pair
- confidence threshold or manual approval recorded

Rejected records should never auto-promote in a later import.

## Required Audits

Projects should adapt these checks:

- no runtime visual points to deprecated resource folders or legacy asset namespaces
- no `source-backed-fallback` or synthetic game visual exists without an explicit temporary exception
- actor direction crops retain enough opaque pixels to prove the frame is not empty or over-cropped
- monster corpse resolution follows authoritative source ids before slug/name candidates
- outfit masks, colors, addons, and walking frames are present where the actor requires them
- neutral and saturated outfit color samples render through the same runtime recoloring path
- spell visuals do not use item icon fallbacks unless explicitly approved
- UI atlas states resolve by role/state
- gold, currency, loot, corpses, effects, missiles, runes, and status visuals pass targeted pixel or metadata parity samples
- active-wave sprite assets preload before gameplay starts where practical
- generated manifests, service-worker precaches, or offline asset indexes are rebuilt after runtime asset files are tracked when the project hashes `git ls-files` output

## Importer Starter And Test Harness

An importer should be small enough to rerun locally and strict enough to fail on ambiguous runtime visuals. At minimum, give adopters tests for:

- package id, package hash, source catalog, source record, and output version in generated evidence
- every shipped runtime category expected by the game: actors, outfits, corpses, items/equipment, loot/currency, effects, missiles, runes, statuses, and UI
- missing authoritative assets recorded in a report instead of replaced by silent fallbacks
- generated runtime paths matching committed public assets
- offline or preload manifests regenerated after asset tracking
- strict cutover blocking deprecated namespaces

## Runtime Handoff

Sprite import correctness is not enough. Runtime adapters should follow the Visual Timeline Contract copied to `docs/hlever/inner-core/VISUAL_TIMELINE_CONTRACT.md` so movement, effects, cooldowns, and projectiles do not restart or stutter on repeated snapshots.

## Non-Goals

- HLever does not commit resource archives, extracted packs, generated atlases, licensed mirrors, or large source art.
- HLever does not make Tibia, OTClient, Fastify, Vite, React, SQLite, or any engine mandatory.
- HLever does not promote review-only art without project approval.
