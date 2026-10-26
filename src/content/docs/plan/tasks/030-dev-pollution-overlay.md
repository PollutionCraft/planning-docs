---
title: "030: Dev pollution overlay (F3)"
status: proposed
owner: Heimdall
---

**Blocked by:** 009 (it reuses its read paths). **Pulled forward** by user decision 2026-10-22. The core mod is **required on both client and server** (decided 2026-10-22).

## Goal

Show live pollution numbers in the F3 debug screen for developers and testers. This is a developer tool, **not** the player-facing display, which stays a Could item in the [brief](../../../brief/overview/).

## Design references

- [Architecture 3.5 dev overlay](../../../design/architecture/#35-external-interfaces-and-contracts-public-api-consumed-by-adapters-compat-and-content), [4 state](../../../design/architecture/#4-conventions): the server is authoritative; the client gets read-only data; no client→server packets
- Task [005](../005-shared-interfaces-and-diffusion/): `ChunkIntervalStats`

## Behaviour

- **Lines shown** (a `Pollution` section appended to the debug-text event): the current chunk's `absorbable` and `persistent`; generated, spread in and out, absorbed and decayed from the last interval; `dominantSource` and rate; global `pressure`; the aggressive flag; marks `(overridden)` for tuned values.
- **Transport:** one server→client payload for the player's chunk, sent after each interval. It is sent only when the player has permission level 2 **and** the overlay is on. A payload for a player with the overlay off is never built.
- **Toggle:** `/pollution overlay on|off` (permission level 2), per player, in memory. Default off.
- **Safety:** a client without the mod cannot join (required-on-both-sides is declared in mod metadata). A missing or stale payload shows `no data` rather than old numbers. The payload carries a protocol version.

## Files owned

- `mod`: payload type and registration, server sender (hooked to interval completion), `overlay` subcommand.
- Client-only class for the debug-text event, isolated so a dedicated server never loads it.
- Pack/install docs: state that the mod is required on both sides (cross-check with the pack repo's README, task 022).

## Tests to write first

1. Unit: payload encode/decode round-trip; version mismatch is rejected.
2. Unit: formatting of the lines, including `no data` and `(overridden)`.
3. GameTest (server side): with overlay off no payload is sent; on, exactly one payload per interval for a level-2 player; a non-operator gets none.
4. Dedicated-server smoke: the server starts with no client class loaded.
5. Manual check, recorded in the PR: F3 in a dev client shows the section and it changes after `/pollution set` and `/pollution step`.

## Commands

`./gradlew build runGameTestServer`; the dedicated-server start is covered by the existing smoke step.

## Out of scope

A player-facing HUD or map, per-neighbour heat maps, client→server packets, persisting the toggle.
