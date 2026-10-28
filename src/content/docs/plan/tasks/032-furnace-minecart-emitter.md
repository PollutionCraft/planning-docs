---
title: "032: Furnace minecart emitter"
status: proposed
owner: Heimdall
---

**Blocked by:** nothing. 029 and 031 are merged. **Sequencing decision of 2026-10-27 (later, user): starts now, in parallel with P2 planning.** The earlier "after P2 absorption" was a sequencing preference, never a technical dependency: 032 uses `emit` ([010](../010-emitter-api/)) and the [011](../011-block-emitter-engine-and-furnace-mapping/) engine, not absorption code. **User decisions, 2026-10-27:** the furnace minecart emits, as its own task, because it is an entity and the block engine cannot track it. **It ships in the alpha**, so it blocks P4. The GregTech adapter (012) is built after it. The design gate below comes first.

## Design gate (required before any code)

This task starts with a **design note, reviewed by Heimdall and checked by Odin against this page, before implementation** (the same step-0 pattern as 011 and 030). The note must answer, from the NeoForge 21.1.x sources and not from memory:

1. **Where is the "lit" state?** On the entity (the furnace minecart tracks fuel in its own data), not a block state. Which field, who updates it, whether it is synced or server-only.
2. **Tracking path.** The minecart moves across chunks and between dimensions, can be loaded or unloaded with its chunk, and can be removed. How the engine finds minecarts without scanning every entity each interval (entity join and leave events, a per-chunk set, or a periodic bounded scan). How a moving minecart's emission is attributed to the chunk it is in at the interval start.
3. **Reuse versus separation.** How much of 011's engine (rules, rate, `emissionMultiplier`, the buffer, the 010 `emit` call) is reused, and what is new. No second `emit` path, no direct field writes ([write rule](../010-emitter-api/)).
4. **Data or code?** Whether the mapping can stay data (an entity type and an activity test), or needs a small code hook. Vanilla entity, so no Mixin or reflection ([ADR 0015](../../../design/decisions/0015-compat-without-build-dependencies-on-target-mods/) rung 1 or 3 only; record the rung).
5. **Rate.** A starting rate proposal against the PU scale (a lit furnace is 1 PU per interval). Placeholder for the P4 playtest.
6. **Cost.** How the budget (0.5 ms/tick, architecture 5) holds with many minecarts (for example 50 lit minecarts moving through many chunks), and what is bounded.
7. **Edge cases:** a minecart out of fuel; fuel added while stopped; carried or pushed by another entity; in an unloaded chunk (emits nothing, like blocks); in a non-ticking chunk.

If the note shows the work is larger than a small task, return to Odin with a split proposal; do not silently widen scope.

## Goal

A lit furnace minecart raises the pollution of the chunk it is in, once per interval, through the same `PollutionApi.emit` path as the block emitters. An unlit one adds none.

## Design references

- [Task 011](../011-block-emitter-engine-and-furnace-mapping/), [task 010](../010-emitter-api/), [task 029](../029-remaining-vanilla-emitter-mappings/), [task 031](../031-emitter-engine-always-active-and-cap/)
- [Architecture 3.3 emission](../../../design/architecture/#33-key-flows)

## Behaviour

To be fixed by the design note. Fixed now:
- Server thread only; only in loaded, ticking chunks; once per interval; amounts exact (the multiplier is applied in the engine, as for blocks).
- Server authoritative. No client packets.
- An entity cannot be lost or double counted across a chunk border: one emission per minecart per interval.

## Tests to write first (outline; the note refines them)

1. GameTest: a furnace minecart with fuel raises its chunk's pollution by its rate per interval; one without fuel adds none.
2. GameTest: a lit minecart crossing a chunk border emits once per interval, into the chunk it is in at the interval start.
3. GameTest: a removed or unloaded minecart stops emitting; a reloaded one resumes.
4. Cost test with many minecarts, inside the budget.
5. A failing run before each test is implemented, pasted in the report.

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

Other entities (mobs, other minecart types), rail systems, absorption, and tuning the rate.
