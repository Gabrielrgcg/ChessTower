# Multiplayer Session Tickets

Session tickets are optional, but every multiplayer or co-op game needs a scoped join contract. Peer-to-peer co-op games should also adopt [P2P_COOP_CONTRACT.md](P2P_COOP_CONTRACT.md).

## Ticket Requirements

- unique ticket id
- session id
- issuing service
- audience or environment, such as staging or production
- host or owner user id when applicable
- host peer id, join target, or opaque room id when applicable
- issued time
- expiry time
- scopes such as `host`, `join`, `browse`, or `spectate`
- signature or server-side lookup
- maximum players or capacity when applicable

## Rules

- Tickets are not saves.
- Tickets are not account sessions.
- Tickets must expire.
- Tickets must be revocable by session closure.
- Tickets authorize multiplayer actions but do not replace account sessions, public-room records, save files, or progression snapshots.
- Ticket payloads must not include OAuth tokens, cookies, client secrets, raw IP addresses, or payment data.
- Browser P2P tickets must bind the account/session owner to the room, peer, or join target strongly enough that one client cannot publish or join as another player.

## Verification

Test:

- valid ticket verifies
- expired ticket fails
- wrong signing secret fails
- missing scope fails
- closed session fails
- wrong audience or environment fails
- public-room browse, heartbeat, and close reject malformed peer ids and stale tickets
- ticket data is absent from product analytics payloads
