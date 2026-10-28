---
title: "032: Furnace minecart emitter"
status: accepted
owner: Heimdall
---

## Acceptance (Odin, 2026-10-28): accept with follow-ups

Branch `feature/032-furnace-minecart-emitter`, not yet committed, pushed or merged. Judged from Sindri's design note, report and Heimdall's design review and code review (all read). I have no shell and did not rerun anything. Reported (Heimdall's runs): clean build and 102 of 102 GameTests twice, core 58 and mod 208 unit tests, class-load check passed; `EmitterGameTests` and `VanillaEmitterGameTests` unedited and green.

**What ships:** a lit furnace minecart emits **0.45 PU per interval** into the chunk it stands in at each interval start, through the same `PollutionApi.emit` path as blocks. An unlit cart adds nothing. New `entity` mapping target (no `active_when`; closed activity list in code); data file `minecraft/furnace_minecart.json`. The block engine's cap, `ChunkTrack` and rescan are untouched.

| Criterion | Result | Evidence |
| --- | --- | --- |
| A fuelled cart raises its chunk by the rate per interval; an unfuelled one adds none; `emissionMultiplier` scales it | Pass | `aLitFurnaceMinecartEmitsItsMappedRateAndAnUnlitOneNothing` (exactly 0.45) |
| One emission per cart per interval, into the chunk it is in at the interval start (no loss, no double count across a border) | Pass | `aLitCartEmitsOncePerIntervalIntoTheChunkItIsInAtTheIntervalStart` |
| Removed cart stops; unloaded cart stops and resumes after reload; dimension change emits in the new level only | Pass | the three matching GameTests (reload waits for entity ticking) |
| Emits only where entities tick (a lit cart whose chunk dropped to loaded-only emits nothing, then emits again) | Pass | `aLitCartInAChunkThatStoppedEntityTickingEmitsNothingUntilItTicksAgain`; Heimdall's mutant of the production check fails exactly this test |
| Changed rules apply at the next interval with no rescan | Pass | `installingChangedRulesAppliesAtTheNextInterval` |
| Bounded: at most 1,024 carts per dimension, lowest UUID wins, exactly one warning | Pass | `overTheBoundOnlyTheLowestUuidsEmitAndOneWarningIsLogged`; mutation run (cap ignored) fails it |
| Vanilla accessor guard: the default display state has `LIT` and follows `Fuel` | Pass | `theDefaultDisplayStateOfAFurnaceMinecartFollowsItsFuel` (fails loudly if a Minecraft bump changes it) |
| No Mixin or reflection; ADR 0015 rung 1 for the mapping, rung 3 for events and public vanilla API | Pass | design review; every member read is public |
| Cost inside 0.5 ms/tick | Pass | 50 lit carts through the production engine tick with the real check: entity pass 14 to 28 µs per interval, 0.3 to 0.6 µs per cart, under 0.0015 ms/tick. Reported, not asserted |
| Known limitation documented | Pass | `docs/emitter-mappings.md`: at most 1,024 carts per dimension |

**Notes and deviations, accepted:**
- **Rate 0.45, not Sindri's proposed 0.5.** Set by the lead on 2026-10-28 by the user's fuel-burn rule (PU per fuel item stays the same): a cart's coal lasts 3,600 ticks against a furnace's 1,600, so about 81 PU per coal against the furnace's 80. A placeholder for the P4 playtest and a one-number data change.
- **Bound and seam tests were written after the code** and confirmed by a mutation run (cap ignored, tick check removed, pruning removed, all failing as intended). Accepted, as in 031.
- **First review round:** Heimdall found that removing the real entity-ticking check broke no test; the unload and reload test could not cover it, because a reloaded cart reads unlit until its first tick. Sindri added the level-33 ticket test above, and the cost figure with the real check. Both are in the table.
- **Cost figures before that round** (3.5 to 6.5 µs for 50 carts) stubbed the tick check and understated the cost by about 7 times. The accepted figure uses the real check.
- The join handler is not tested with a cancelling handler. Low risk; it runs at lowest priority and does not receive cancelled events.

**Follow-ups:**
1. **P3 (Mimir):** a moving cart's rail block position can become a chunk's `dominantSource`. P3 must decide whether entity emissions count (roadmap, P3 open question). Not changed here.
2. **P4 (023):** measure the entity pass in the real pack with carts running on rails through many chunks. The bound of 1,024 stays a constant unless a playtest comes near it.
3. **Rate 0.45** is tuned at the P4 playtest with the rest.
4. **M1:** with 032 accepted, every vanilla emitter in the alpha set has a passing GameTest. **The remaining part of M1 is 012 (GregTech machines),** which needs the user's acceptance of ADR 0016, task 033 (the with-targets job) and its own design gate.

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
