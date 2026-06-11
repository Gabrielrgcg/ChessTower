# Offline and Online Modes

## Offline Single-Player

Required:

- local launch without network
- local save/load
- clear offline update mode in `/api/release` when served by a preview/runtime
- no dependency on account service for core play

Recommended:

- service worker or engine-native cache manifest
- visible stale-build handling
- local save export/import for recovery

## Online Single-Player

Required:

- server-authenticated session when account-linked
- server-owned save and progression
- operational metrics for persistence and request pressure
- account failures separated from save corruption

## Multiplayer

Required:

- server-issued or server-validated tickets
- ticket expiry
- scoped permissions
- host/join/browse boundaries
- no ticket secrets in logs or analytics
- for peer-to-peer co-op, adopt [P2P_COOP_CONTRACT.md](P2P_COOP_CONTRACT.md) so public rooms, host authority, snapshots, backpressure, and recovery are explicit

## Hybrid

Required:

- feature-by-feature ownership table
- explicit offline-to-online sync policy
- conflict policy
- account-gated features fail closed
- solo offline play remains available if that is a product promise
