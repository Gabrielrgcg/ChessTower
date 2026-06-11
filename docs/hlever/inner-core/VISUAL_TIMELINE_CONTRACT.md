# Visual Timeline Contract

The game server remains authoritative for gameplay state, but sprite presentation should not remount, restart, or stutter just because a polling snapshot repeats the same state.

## Required Snapshot Fields

State snapshots that drive animated clients should include:

- `stateRevision`: monotonically increasing authoritative revision.
- `serverTimeMs`: server timeline timestamp for the snapshot.
- `events`: recent authoritative visual events.
- `clientCommandId`: optional id echoed back when a client action was accepted, rejected, or deduped.

`stateRevision` gates gameplay state. `clientCommandId` dedupes local input acknowledgement. Neither should be used as an atlas id or sprite id.

## Event Types

Use stable event ids and server timestamps for presentation events such as:

- `cooldown_started`
- `unit_moved`
- `combat_effect_started`
- `projectile_started`
- `resource_changed`
- `unit_spawned`
- `unit_removed`
- `loot_dropped`
- `loot_collected`
- `wave_phase_changed`

Clients may keep a short rolling event window. Repeated snapshots should merge by event id instead of restarting animation state.

For peer-to-peer co-op, use this contract together with [P2P_COOP_CONTRACT.md](P2P_COOP_CONTRACT.md). Host snapshots should carry sequence ids, optional delta base ids, acknowledged input sequences, and enough timestamp data for peers to present corrections without duplicating effects.

## Client Presentation Rules

- Cooldowns render from authoritative start and end time.
- Effects and projectiles start with elapsed-aware animation delay when they arrive late.
- Moving units render in a stable battlefield overlay keyed by unit id; grid cells remain authoritative data, not the animated sprite parent during motion.
- Idle units use static directional sprites. Walking sheets mount only during active movement.
- Loot, corpses, target rings, floating text, and resource bars anchor to sprite geometry from the Skin contract.
- Active wave assets should preload before the wave becomes playable where practical.
- Prediction is presentation-only. Server state wins on correction, and corrections should be visible without duplicating effects.
- In P2P host-authoritative games, the host peer takes the same presentation authority role as the server for snapshots and visual events, but peers still send input or intent rather than authoritative world mutations.

## Verification

Each adapter should have targeted tests or browser checks for:

- repeated snapshots do not reset cooldown arcs
- late effects start at the correct elapsed frame
- movement interpolation does not remount unit sprites into destination cells
- asset preloading covers active terrain, actors, loot, corpses, effects, missiles, and UI primitives
- state size and polling cadence are observable in metrics
- P2P snapshot deltas recover with full snapshots when a peer is missing the base sequence
- movement corrections reconcile prediction without replaying old visual events
