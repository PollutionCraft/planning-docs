---
title: "030: Dev pollution overlay (F3)"
status: accepted
owner: Heimdall
---

## Acceptance (Odin, 2026-10-26): accept with follow-ups, pending the user's manual check

Branch `feature/030-dev-pollution-overlay`, commit `1130bc5`, not yet pushed or merged. Judged from Heimdall's step-0 and code reviews and Brokkr's report (all read). I have no shell and did not rerun anything. Reported (Heimdall's runs): 67 of 67 GameTests three times, one with the configuration cache; core 58 and mod 175 unit tests; class-load check 23,807 classes, none from `mod.client` or `net.minecraft.client`; sender cost 6.7 to 7.1 µs per interval with 8 subscribers (0.00035 ms/tick).

| Criterion | Result | Evidence |
| --- | --- | --- |
| Payload round trip; version mismatch handled | Pass | codec GameTests; a hand-built version 2 decodes to `unsupported` and the reader stops exactly at its end |
| Line formatting, `no data`, `(overridden)` | Pass | `OverlayTextTest`, `OverlayDisplayTest`; lines come from `PollutionText` and `RatesText`, no copy |
| Overlay off: nothing built or sent; on: one payload per committed interval; level 0 gets none | Pass | `OverlayGameTests`; Heimdall's mutants fail the permission, toggle and immediate-send tests |
| Permission re-checked every interval (de-op stops it at once) | Pass | `aDeoppedPlayerStopsReceivingAtOnce` |
| Server starts with no client class loaded | Pass | ArchUnit rule plus runtime class-load check with a positive control; each shown failing once |
| Mod required on both sides | Pass by design, **not tested live** | non-optional payload channel; real refusal of a modless client is a manual check |
| Server authoritative, no client→server packets, toggle per player, in memory, default off, cleared on logout | Pass | review pass 1 |
| F3 shows the section and it changes after `set` and `step` | **Not yet verified** | the two client classes have no automated test; manual check below |

**Design changes versus the original page (approved in step-0 review, now binding):**
1. **Formatting happens on the server.** The payload carries ready lines from `PollutionText` and `RatesText`; the client only appends them. Bounds: at most 32 lines of 256 characters; a payload over the bound is a corrupt stream and throws.
2. **Payload layout:** protocol version, body length, body. A client reading an unknown version skips exactly the body and shows `no data`; it is never disconnected.
3. **Network channel version stays `"1"`**, separate from the payload protocol version. Overlay format changes go through the protocol version, so a dev-tool change never refuses a join.
4. **`/pollution overlay on` sends one payload at once** to the executing player (same permission and toggle checks), because the interval can be up to 1 hour. `off` sends nothing; the client falls to `no data` by staleness.
5. **Placeholders:** `pressure` shows `0 (until task 016)` and `aggressive` shows `n/a (until task 016)`. `isAggressive` is never called.
6. **`no data`** is also shown when the player is in a different chunk or dimension, or the data is older than three intervals.
7. A payload is built only for a subscribed player who holds permission level 2 now.

**Follow-ups:**
1. No automated test for `ClientOverlay` and `ClientOverlayHud` (accepted: thin adapters, logic is in the unit-tested `OverlayDisplay`; loading them in a test would defeat the dedicated-server check). The manual check covers them.
2. **P4 performance run (023):** report the 99th percentile of the rescan slice, not the maximum. Single-tick maxima (93 to 417 µs seen) are GC and JIT noise; the mean is stable at about 60 µs.
3. Heimdall, low priority: local GameTest runs take 35 to 44 s on btrfs (about 3 s on tmpfs). The extra time is in 011's far-chunk batches, not 030's tests. Try the class-load log on tmpfs or CI-only if it bothers anyone.
4. Nit: fold `OverlaySender`'s duplicated default lambda and sink into constants next time the class is touched.
5. The pack repo README (task 022) must say the mod is required on both sides. This repo's README now does.

**The user's manual acceptance check** (this closes the "Not yet verified" rows above):
1. In `runClient` as an op: `/pollution overlay on`. F3 shows a `Pollution` section straight away. After `/pollution set 20` and `/pollution step` the numbers change.
2. `/pollution overlay off`, or walk into another chunk: the section shows `no data` (at once for `off` after the staleness window; at the next interval for a chunk change).
3. Joining a server that has the mod with a client that lacks it is refused. Also check the reverse if easy.
4. Run a furnace with coal next to you and watch `generated` rise (this is also the furnace demo for 011).

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
