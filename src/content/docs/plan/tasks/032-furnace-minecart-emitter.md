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

## Design gate result (Odin, 2026-10-28): passed; implementation may start

Checked against this page: Sindri's note `032-sindri-design.md` and Heimdall's review `032-sindri-design-review.md` (both read; the sources were read by them, I did not re-read them). Heimdall's five changes (C1 to C5 in his review) are applied by Sindri before code; I checked them below as conditions, not as done.

**All seven questions are answered:**
1. **Lit state:** on the entity. A private `int fuel` and a synched boolean `DATA_ID_FUEL`, written only on the server at the end of the cart's own `tick()`. Read through the public `getDefaultDisplayBlockState()` (its `LIT` equals `hasFuel()`), never `getDisplayBlockState()`, which follows a custom `DisplayState`.
2. **Tracking:** an identity set per dimension, fed by `EntityJoinLevelEvent` and `EntityLeaveLevelEvent`, with an `isRemoved()` and level check at read time. No entity scan. One emission per cart on the interval-start tick, into the chunk at its block position at that instant.
3. **Reuse:** rules loader, multiplier and the single `emit` call. Nothing new on the write path.
4. **Data or code:** the target and rate are data (`{"entity": "minecraft:furnace_minecart", "rate": ...}`); the activity test is a closed list in code (`EntityActivity`). ADR 0015 rung 1 for the mapping, rung 3 for events plus public vanilla API. No Mixin, no reflection.
5. **Rate:** see below.
6. **Cost:** about 1 µs per cart, estimated; 50 carts about 0.0025 ms/tick. To be measured and reported, not asserted.
7. **Edge cases:** every case on this page is covered, plus others (dimension change, custom display state, cancelled join, restart).

**Scope check: nothing widens it beyond a small task.** One addition to note: the mapping format gains an `entity` target, restricted to a closed list of one (the furnace minecart). That follows from question 4 and is not a general entity-emitter feature; mapping any other entity needs a new task. No split.

**Decisions (user's rules and Heimdall's review, accepted):**
- **Entity-ticking test.** A cart emits only where `isPositionEntityTicking` is true (blocks keep `shouldTickBlocksAt`). A cart in a chunk that does not entity-tick burns no fuel, so it must not pollute for free.
- **Rate: 0.45 PU per interval while lit, placeholder for the P4 playtest.** By the user's fuel-burn rule (PU per fuel item stays the same: blast furnace 2.0 is exactly 80 PU per coal), a cart's coal lasts 3,600 ticks against a furnace's 1,600, which gives 0.44 for 80 PU per coal. Sindri proposed 0.5 (90 PU per coal, 12% above the rule); the lead set 0.45 on 2026-10-28 to follow the rule. It is a one-number data change.
- **Known limitation: 1,024 tracked carts per dimension.** A constant, not a config key. Past it, the carts with the lowest UUID emit and the rest emit nothing, with one `WARN` per level per minute. Must be written into `docs/emitter-mappings.md` (the same way 031 documents its cap); 032 is not done until it is. Make it a config key only if a playtest comes near it.
- **Dominant source (P3 question).** A moving cart's block position, usually a rail, can become a chunk's `dominantSource`, stale a few seconds later. The overlay and `get` show it as is. Siege targets `dominantSource` and breaks the source block (ADR 0006), so P3 must decide whether entity emissions count as a dominant source. Recorded in the roadmap under P3.

**Conditions on the implementation (from Heimdall's changes):**
- The cost test **reports** the cost (50 carts; 1,100 carts with the bound) and does not assert on wall time. It asserts only that exactly 1,024 emit and one warning is captured through a log seam.
- GameTests assert a pollution delta only on chunks that track no mapped block (the 029 `cleanChunks` precondition), because villages generate furnaces and campfires.
- The unload and reload test waits for entity ticking, not a fixed tick count. The non-ticking case asserts `isPositionEntityTicking == false` first.
- The block cap, `ChunkTrack` and the rescan stay untouched. The existing `EmitterGameTests` and `VanillaEmitterGameTests` stay green, unedited, and the report says so.
- A red run is quoted for each test before its code. Heimdall and Sindri never run Gradle in the worktree at the same time.

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
