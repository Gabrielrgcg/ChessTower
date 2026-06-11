# P2P Co-op Contract

This contract is for games that want browser-style peer-to-peer co-op while keeping HLever engine-neutral. WebRTC and PeerJS are valid reference transports, but HLever does not require either one.

Use this alongside [MULTIPLAYER_SESSION_TICKETS.md](MULTIPLAYER_SESSION_TICKETS.md), [VISUAL_TIMELINE_CONTRACT.md](VISUAL_TIMELINE_CONTRACT.md), and the game's persistence contract.

## Ownership Model

- The game server owns identity, account session checks, co-op ticket issue and verification, public-room registry, entitlement checks, and abuse/rate limits.
- The host peer may own the live simulation only when peers send input or intent messages and receive authoritative snapshots back from the host.
- Joining peers do not own rewards, progression, enemy state, loot state, room membership, or run completion.
- Public-room browsing is a discovery surface, not a save system or authority source.
- Tickets and room records must not contain OAuth tokens, cookies, client secrets, raw IP addresses, payment data, or long-lived account identifiers.

## Server Surfaces

A P2P co-op game should provide equivalent routes or engine-native services for:

- issue co-op ticket: authenticates the account session and returns a scoped, expiring ticket
- verify co-op ticket: validates signature or server lookup, expiry, audience, session, and required scope
- list public rooms: returns non-secret room summaries filtered by build or protocol version
- heartbeat public room: refreshes the host-owned room record for a short TTL
- close public room: removes the room when the host leaves or closes the party

Public room responses should be `no-store` or equivalent. Heartbeats should fail closed when the account session, ticket, build version, peer id, capacity, or entitlement check is invalid.

## Ticket Shape

P2P tickets should include:

- ticket id
- session or party id
- issuing service
- audience or environment, such as staging or production
- account/user id or stable server-side owner reference
- host peer id or join target when applicable
- scopes such as `host`, `join`, `browse`, or `spectate`
- issued time, expiry time, and maximum players where applicable
- signature or server-side lookup key

Tickets authorize co-op actions. They are not account sessions, progression snapshots, save files, or public-room records.

## Public Room Records

Public-room records should be short-lived and safe to display:

- stable room id
- host peer id or opaque join key
- build or protocol version
- host display name after sanitization
- player count and maximum players
- room type, status label, and whether a run is in progress
- optional class, character, or readiness summaries that do not reveal private account data

The registry should replace the host's prior active room on heartbeat, expire stale rooms automatically, and reject malformed peer ids or share URLs. If a feature is premium-gated, the heartbeat should re-check the entitlement instead of trusting the client.

## Peer Message Rules

Peer messages should use an allowlisted envelope:

- `type`: known message type
- `messageId`: unique id for dedupe where useful
- `sentAtMs`: sender timeline timestamp
- `senderPeerId`: transport identity bound to the verified ticket or connection
- `sequence`: monotonic sequence for inputs, snapshots, or visual events when ordering matters

Host-bound messages should be limited to player intents such as input, lobby selections, ready state, chat, invite refresh, and leave requests. Peer-bound messages should carry host-authoritative lobby sync, join denial, start/cancel state, snapshots, movement corrections, visual events, reward or pickup sync, run progress, party closure, and host migration.

Reject unknown message types, messages from the wrong role, stale input after a peer becomes spectator-only or kicked, and gameplay mutations that do not match the sender's slot or ticket identity.

## Snapshot And Visual Sync

The host should send authoritative snapshots with:

- snapshot sequence and optional base sequence for deltas
- full snapshot recovery at a bounded cadence
- acknowledged input sequence per peer
- server or host timeline timestamp
- visible player, enemy, projectile, loot, reward, and run-progress state needed by peers
- correction messages when accepted input diverges too far from authority

Visual events should use the [VISUAL_TIMELINE_CONTRACT.md](VISUAL_TIMELINE_CONTRACT.md) rules: stable event ids, timeline timestamps, dedupe, elapsed-aware playback, and active-asset preloading. High-volume visual events may travel as a side channel, but they remain host-authoritative presentation events rather than gameplay authority.

Deltas should only be used when smaller than full snapshots and when the peer has the required base sequence. Peers should drop obsolete snapshots, cap snapshot buffers, cap visual-event queues, and stop sending low-priority traffic when transport backpressure is high.

## Recovery And Migration

P2P co-op should define:

- reconnect behavior for a peer with a still-valid ticket
- host disconnect and party-closed behavior
- host migration or leader transfer, including which peer may become host
- stale public-room expiry when heartbeats stop
- spectator behavior for full rooms, in-progress runs, dead/downed players, and kicked players
- invite refresh behavior when room type changes between private and public

If host migration is supported, the migration message must name the next host, carry enough lobby/run state for continuity, and prevent two hosts from accepting authority at the same time.

## Metrics And Diagnostics

Expose local or server-side diagnostics for:

- ticket issue, verify, expiry, scope mismatch, and closed-session failures
- public-room list, heartbeat, close, stale expiry, and entitlement failures
- peer connection count, role, reconnects, and host migration
- round-trip time, jitter, snapshot rate, input rate, bytes per second, dropped snapshots, out-of-order snapshots, full versus delta bytes, correction counts, and transport backpressure
- rejected movement or action reasons without logging secrets or raw private network details

## Verification

Before release, test:

- ticket lifecycle: valid, expired, wrong audience, wrong scope, closed session, and wrong signing key or lookup
- public-room browse, heartbeat, stale expiry, close, build-version filter, capacity, safe peer id, and premium gate where applicable
- host-bound and peer-bound message allowlists
- peer input sequencing, acknowledgement, resend, stale-input rejection, and movement correction
- snapshot full/delta assembly, missing base fallback, full recovery cadence, buffer caps, and backpressure drops
- visual-event dedupe and elapsed-aware playback
- reconnect, party close, leader transfer, host migration, spectator mode, and kicked-player behavior
- chat sanitization and proof that chat cannot mutate gameplay state

## Non-Goals

- HLever does not provide a managed relay, TURN service, STUN service, PeerJS broker, or paid transport provider.
- HLever does not make browser networking mandatory for Unity, Godot, native, or server-authoritative games.
- HLever does not make P2P acceptable for competitive or economy-critical authority unless the game adds its own anti-abuse controls and accepts the product risk.
