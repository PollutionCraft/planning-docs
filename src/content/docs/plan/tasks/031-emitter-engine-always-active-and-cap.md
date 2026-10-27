---
title: "031: Emitter engine: always-active rules and a tracked-position cap"
status: accepted
owner: Heimdall
---

## Acceptance (Odin, 2026-10-27): accept with follow-ups

Branch `feature/031-emitter-always-active-and-cap`, commit `65fa722`, not yet pushed or merged. Judged from Heimdall's step-0 and code reviews, Brokkr's report and `docs/emitter-mappings.md` (all read). I have no shell and did not rerun anything. Reported (Heimdall's runs): 79 of 79 GameTests twice, core 58 and mod 200 unit tests, class-load check clean, no shipped data changed.

| Criterion | Result | Evidence |
| --- | --- | --- |
| `active_when` optional; absent means always active; half-specified forms rejected | Pass | `MappingValidatorTest`; `MappingEntry` has a nullable `ActiveWhen`, so a half-specified entry cannot be represented |
| Always-active block emits its rate, stops when removed, nothing in a non-ticking chunk, emits again after unload and reload | Pass | three GameTests; the non-ticking one fails when the tick check is removed |
| State rules unchanged (regression) | Pass | `aStateMappingStillEmitsOnlyWhileLitBesideAnAlwaysActiveOne`, all 011 tests |
| Cap: `maxTrackedPerChunk`, tracked count equals the cap, emitted amount equals cap × rate, one log line, other chunks unaffected | Pass | `aChunkOverTheCapTracksTheLowestPositionsAndEmitsForThemOnly` (exact positions, 8 × 0.25 = 2.0) |
| Cap is deterministic | Pass | `everyDiscoveryPathKeepsTheSameLowestPositionsWhateverTheOrder` (three event orders plus the chunk-load scan) |
| Removal from a capped chunk is repaired; a cap change takes effect | Pass | both bounded in engine ticks, no wall clock (repair 1 tick, cap change 1 tick; design bound about 16) |
| Cost inside 0.5 ms/tick | Pass | totals 0.08 to 0.165 ms/tick in every scenario; emission 0.13 to 0.18 µs per tracked block; rescan slice mean under 70 µs everywhere |
| One new config key only; no shipped mapping | Pass | `ConfigRegistry`, `ServerConfig`; nothing under `mod/src/main/resources` |

**The final rule (replaces "working name" and "bounds to be set" above):** key `maxTrackedPerChunk`, integer, default **2,048**, bounds **1 to 98,304**, no cross-field rule with `maxEmittersPerChunk`. A chunk keeps its **lowest packed positions**: furthest west first, then furthest north, then lowest. Blocks past the cap emit nothing and are not merged into others. Torches and any always-active block are written as an entry **without `active_when`**.

**Deviations, accepted:**
- **Design:** the approved sorted tree set was replaced by a sorted `long[]` plus a primitive scan heap, after measurement (tree set: rescan p99 870 µs dense, 559 µs at the cap). Same rule and the same convergence argument. The second rescan limit (512 kept positions per tick) stays because "without" exceeds 0.1 ms p99 in the two dense cases.
- **Process:** `ChunkTrackTest` was written after the structure was rewritten, not before. Heimdall's mutants fail it (3 of 7 and 5 of 7). The cap's behaviour itself was test-first (GameTests red against stubs, absence tests red via mutants). Rule for next time: when a measured redesign replaces a structure, write the new structure's unit tests first, with the old structure as the stub.

**What the measurement means (for the user, and for 029's rates):**
- Each active tracked block costs 0.13 to 0.18 µs per interval. **About 58,000 to 60,000 active tracked blocks, level-wide, use the whole 0.5 ms/tick budget.** Diffusion at 2,500 chunks takes about 0.06 of it.
- There is **no level-wide cap.** Twenty chunks at the default cap would be 41,000 blocks (about 0.31 ms/tick with diffusion). Typical play, such as 300 torches in each of 20 chunks (6,000 blocks), costs 0.155 ms/tick.
- Escalation options if playtests approach the limit: a level-wide cap; merging a chunk's blocks into one emission; spreading the emission pass across ticks (this smooths the spike, not the average).
- Pollution ceiling per chunk from torches alone: 2,048 × 0.01 = 20.48 PU per interval, about 20 furnaces.

**Follow-ups:**
1. **Level-wide cap decision (P4 and playtest).** Not needed now. Revisit if the performance run or a playtest shows tracked blocks near 40,000.
2. **GameTest run time.** A local run takes 2 to 4 minutes (btrfs disk writes in the chunk-forcing batches; the same tree on tmpfs runs in 6.7 s). Heimdall: check the CI GameTest step on this PR; if it exceeds about 3 minutes, move the `measure…` tests behind an opt-in Gradle property.
3. **P4 profiling item:** the dense-layout finishing tick (sort, merge, one read per candidate) is 100 to 140 µs on its own, p99 143 to 155 µs against a 100 µs target, for 32,768 mapped blocks in one chunk. Accepted as pathological. If spark on target hardware shows it, slice the validation reads across ticks. Report p99 and mean in 023.
4. **Known limitation, for 029 and the playtest:** the cap ranks by position, not by rate. In a chunk over 2,048 mapped blocks, torches in the west or north can take the slots of a furnace in the east, which then stops emitting. A chunk needs more than 2,048 mapped blocks for this, so it is pathological, but a torch-lit mine plus a base could get near it. If playtests show it, rank by rate first (highest rate keeps its slot), position second.
5. A lowered cap leaves a chunk emitting for its old, larger set for a few seconds until the rescan (documented in `docs/emitter-mappings.md`).

**Blocked by:** 011 (accepted). **Blocks:** 029 (the vanilla mappings need both additions). **Origin:** user decision 2026-10-27 (light sources emit, and they have no activity state; soul torches and soul lanterns do not; the furnace minecart is built after P2, so 031 and 029 come first); the cap is follow-up 1 of the 011 acceptance. Split from 029 by Odin so the engine change is reviewed and measured on its own, before any data depends on it.

## Goal

Two small additions to the block emitter engine from [011](../011-block-emitter-engine-and-furnace-mapping/), with no shipped mapping:

1. A mapping entry may omit `active_when`. Such a block is **always active**: it emits its `rate` every interval for as long as it is placed in a loaded, block-ticking chunk.
2. A **cap on tracked positions per chunk**, so a chunk with thousands of mapped blocks cannot make the engine's cost or memory unbounded.

## Design references

- [Task 011](../011-block-emitter-engine-and-furnace-mapping/) acceptance note (discovery, follow-up 1), `docs/emitter-mappings.md` in the mod repo (the format; this task owns the edit)
- [Task 010](../010-emitter-api/): `maxEmittersPerChunk` caps *attributed* positions in the buffer; this task caps *tracked* positions in the engine. They are different limits.
- [Architecture 3.3 emission](../../../design/architecture/#33-key-flows), [5 budget](../../../design/architecture/#5-non-functional-budget)

## Behaviour

- **Mapping format:** `active_when` becomes optional. An entry without it is always active. An entry with `active_when` behaves exactly as today. A malformed `active_when` (for example a property without a value) is still an invalid entry: skipped and logged. The mod does not guess.
- **Removal still works without an event.** The engine reads each tracked position's block state at every interval start, as today. An always-active block is dropped when the block there is no longer a mapped block. Only the "is the state active" test is skipped.
- **Cap:** a new config key (camelCase, in the registry, so `/pollution tune` gets it for free), `maxTrackedPerChunk`. Integer, default **2,048**, bounds 1 to 98,304 (as built; above "hundreds of torches" and below the 4,096 buffer cap, so attribution does not overflow first, though no cross-field rule enforces that). Past the cap, further positions in that chunk are **not tracked** and emit nothing. One log line per chunk per rescan period, not per block.
- **The cap must be deterministic.** Which positions are kept must not depend on load order, placement order or restarts. Constraint, not a prescription: the same blocks in the same chunk give the same tracked set after unload, reload and restart (for example, the lowest packed positions win). Heimdall's design step picks the mechanism.
- **The cap is read when a chunk is scanned or rescanned**, like the other engine constants. A change through `/pollution tune` applies from the next scan.
- Everything else in 011 holds: only block-ticking chunks emit, sampling is once per interval, `emissionMultiplier` is applied in the engine, the 60 s rescan.

## Files owned

`mod`: `…mod.emitter.*` (`MappingEntry`, `MappingValidator`, `EmitterRules`, `EmitterEngine`, tracker), `config/ConfigRegistry.java` and `config/ServerConfig.java` (the one new key and its accessor only), `docs/emitter-mappings.md`. Tests: the existing `MappingValidatorTest`, `EmitterGameTests`, plus new ones. A **test-only** always-active mapping in the GameTest resources (never shipped). No shipped mapping.

## Conditions

- **Design step first.** A short design note, reviewed by Heimdall before code, covering: the cap mechanism and its determinism; what happens to a tracked position when a chunk goes over the cap after a rescan; the default and bounds.
- **Red run for every test before implementing**, with the failing lines pasted. Missing this is grounds for rejection.
- **Cost measured**, against the 0.5 ms/tick budget (architecture 5): see test 6.
- Camelcase config key. Update `docs/emitter-mappings.md` in the same change.

## Tests to write first

1. Unit: an entry without `active_when` parses as always-active; an entry with a half-specified `active_when` is rejected; existing parse cases unchanged.
2. GameTest, test-only always-active block: placed, emits `rate` per interval with no property involved; removed, stops from the next interval; in a non-ticking chunk, emits nothing; after unload and reload, emits again.
3. GameTest: an `active_when` entry still emits only while its state matches (regression for 011).
4. GameTest, cap: place more than the cap in one chunk (use a low configured cap); the tracked count equals the cap; the emitted amount equals cap × rate; one log line; a second chunk is unaffected.
5. GameTest, determinism: after unload and reload the same positions are tracked; adding a block with a lower packed position replaces the highest tracked one (or whatever rule the design picks, stated and tested).
6. Cost (`measure…` test): hundreds of always-active blocks in one chunk, the cap's worth in one chunk, and many chunks each holding hundreds. Report the emission pass, the chunk-load scan (typical and worst), the rescan slice (**99th percentile and mean**, not the single-tick maximum) and the total ms/tick with 2,500 spreading chunks. Must stay inside 0.5 ms/tick.
7. Adapter-import and architecture checks stay green.

## Commands

`./gradlew build runGameTestServer`.

## Out of scope

Any shipped mapping (029). Entities (032). A per-block-type cap. Aggregating over-cap blocks into one emission (a possible later change if playtests show players using the cap to cap their own pollution).
